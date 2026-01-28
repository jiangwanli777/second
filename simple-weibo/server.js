const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 数据库初始化
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('成功连接到SQLite数据库');
    initDatabase();
  }
});

// 初始化数据库表
function initDatabase() {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 好友关系表
  db.run(`
    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (friend_id) REFERENCES users(id),
      UNIQUE(user_id, friend_id)
    )
  `);
  
  // 留言表
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      encrypted_content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // 启动定时任务清理过期留言
  setInterval(cleanupExpiredPosts, 60 * 1000); // 每分钟检查一次
}

// 加密工具函数
const encryptionKey = 'simple-weibo-secret-key'; // 实际部署时应使用环境变量

function encrypt(text) {
  const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encryptedText) {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('解密失败:', error);
    return '解密失败';
  }
}

// 清理过期留言（24小时前）
function cleanupExpiredPosts() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.run(
    'DELETE FROM posts WHERE created_at < ?',
    twentyFourHoursAgo,
    function(err) {
      if (err) {
        console.error('清理过期留言失败:', err.message);
      } else if (this.changes > 0) {
        console.log(`已清理 ${this.changes} 条过期留言`);
      }
    }
  );
}

// API路由

// 用户注册
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  // 检查用户名是否已存在
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    
    if (row) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 创建新用户
    db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, password],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '注册失败' });
        }
        
        res.status(201).json({ message: '注册成功', userId: this.lastID, username });
      }
    );
  });
});

// 用户登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  // 验证用户
  db.get(
    'SELECT id, username FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      if (!row) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }
      
      res.status(200).json({ message: '登录成功', user: { id: row.id, username: row.username } });
    }
  );
});

// 发送好友请求
app.post('/api/friends/request', (req, res) => {
  const { userId, friendUsername } = req.body;
  
  if (!userId || !friendUsername) {
    return res.status(400).json({ error: '用户ID和好友用户名不能为空' });
  }
  
  // 查找好友用户ID
  db.get('SELECT id FROM users WHERE username = ?', [friendUsername], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    
    if (!row) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const friendId = row.id;
    
    // 检查是否已经是好友或已有请求
    db.get(
      'SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }
        
        if (existing) {
          return res.status(400).json({ error: '已经发送过好友请求或已经是好友' });
        }
        
        // 发送好友请求
        db.run(
          'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)',
          [userId, friendId, 'pending'],
          function(err) {
            if (err) {
              return res.status(500).json({ error: '发送好友请求失败' });
            }
            
            res.status(201).json({ message: '好友请求已发送' });
          }
        );
      }
    );
  });
});

// 接受好友请求
app.post('/api/friends/accept', (req, res) => {
  const { friendshipId } = req.body;
  
  if (!friendshipId) {
    return res.status(400).json({ error: '好友关系ID不能为空' });
  }
  
  // 更新好友关系状态
  db.run(
    'UPDATE friendships SET status = ? WHERE id = ?',
    ['accepted', friendshipId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '好友请求不存在' });
      }
      
      res.status(200).json({ message: '好友请求已接受' });
    }
  );
});

// 拒绝好友请求
app.post('/api/friends/reject', (req, res) => {
  const { friendshipId } = req.body;
  
  if (!friendshipId) {
    return res.status(400).json({ error: '好友关系ID不能为空' });
  }
  
  // 删除好友请求
  db.run(
    'DELETE FROM friendships WHERE id = ?',
    [friendshipId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '好友请求不存在' });
      }
      
      res.status(200).json({ message: '好友请求已拒绝' });
    }
  );
});

// 获取好友请求列表
app.get('/api/friends/requests/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: '用户ID不能为空' });
  }
  
  // 查询收到的好友请求
  db.all(
    `
      SELECT f.id, u.username, f.created_at 
      FROM friendships f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'pending'
    `,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      res.status(200).json({ requests: rows });
    }
  );
});

// 获取好友列表
app.get('/api/friends/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: '用户ID不能为空' });
  }
  
  // 查询已接受的好友关系
  db.all(
    `
      SELECT u.id, u.username 
      FROM friendships f
      JOIN users u ON (f.friend_id = u.id AND f.user_id = ?) OR (f.user_id = u.id AND f.friend_id = ?)
      WHERE f.status = 'accepted'
    `,
    [userId, userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      res.status(200).json({ friends: rows });
    }
  );
});

// 创建留言
app.post('/api/posts', (req, res) => {
  const { userId, content } = req.body;
  
  if (!userId || !content) {
    return res.status(400).json({ error: '用户ID和内容不能为空' });
  }
  
  // 加密内容
  const encryptedContent = encrypt(content);
  
  // 保存留言
  db.run(
    'INSERT INTO posts (user_id, content, encrypted_content) VALUES (?, ?, ?)',
    [userId, content, encryptedContent],
    function(err) {
      if (err) {
        return res.status(500).json({ error: '创建留言失败' });
      }
      
      res.status(201).json({ 
        message: '留言创建成功', 
        post: {
          id: this.lastID,
          user_id: userId,
          content,
          created_at: new Date().toISOString()
        }
      });
    }
  );
});

// 获取用户的留言
app.get('/api/posts/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: '用户ID不能为空' });
  }
  
  // 查询用户的留言
  db.all(
    'SELECT id, content, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      res.status(200).json({ posts: rows });
    }
  );
});

// 获取好友的留言
app.get('/api/friends/posts/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: '用户ID不能为空' });
  }
  
  // 查询好友的留言
  db.all(
    `
      SELECT p.id, p.user_id, u.username, p.content, p.created_at 
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN friendships f ON (p.user_id = f.friend_id AND f.user_id = ? AND f.status = 'accepted') OR (p.user_id = f.user_id AND f.friend_id = ? AND f.status = 'accepted')
      ORDER BY p.created_at DESC
    `,
    [userId, userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      res.status(200).json({ posts: rows });
    }
  );
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('数据库关闭失败:', err.message);
    } else {
      console.log('数据库连接已关闭');
    }
    process.exit(0);
  });
});