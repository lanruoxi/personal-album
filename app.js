`use srtict`;
const express = require('express');

// 解析post请求体数据
const bodyParser = require('body-parser');
// 引入文件功能增强的包
const fse = require('fs-extra');

// 解析上传文件的包
const formidable = require('formidable');

// 引入path核心对象
const path = require('path');

const mysql = require('mysql');
const pool = mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'root',
    password: 'buzhidao',
    database: 'album'
});

// 创建服务器
let app = express();
app.engine('html', require('express-art-template'));

// 路由配置规则
let router = express.Router();

// 测试路由
router.get('/test', (req, res, next) => {
    pool.getConnection(function (err, connection) {
        connection.query('SELECT * FROM album_dir',
            function (error, results, fields) {
                // 查询完毕后，释放连接
                connection.release();
                if (error) throw error;
                res.render('test.html', {
                    text: results[2].dir
                });
            });
    });
})

    // 显示相册列表
    .get('/', (req, res, next) => {
        //获取连接
        pool.getConnection((err, connection) => {
            //处理获取连接时的异常，比如停网了
            if (err) return next(err);
            //使用连接查询所有的album_dir所有数据
            connection.query('select * from album_dir', (error, results) => {
                //查询完毕以后，释放连接
                connection.release();
                //处理查询时带来的异常，比如表名错误
                if (err) return next(err);
                res.render('index.html', {
                    album: results
                });
            })
        });
    })

    // 显示照片列表
    .get('/showDir', (req, res) => {
        // 获取URL上的查询字符串
        let dirname = req.query.dir;
        pool.getConnection((err, connection) => {
            if (err) return next(err);
            connection.query('select * from album_file where dir =?', [dirname],
                (error, results) => {
                    connection.release();
                    if (err) return next(err);

                    // 记录相册名
                    res.render('album.html', {
                        album: results,
                        dir: dirname
                    })
                })
        })
    })

    // 添加目录
.post('/addDir', (req, res, next) => {
    let dirname = req.body.dirname;
    pool.getConnection((err, connection) => {
        if (err) return next(err);
        connection.query('insert into album_dir values (?)',
            [dirname], (error, results) => {
                connection.release();
                if (err) return next(err);
                res.redirect('/showDir?dir=' + dirname);
            })
    });
})

// 添加照片
.post('/addPic',(req,res)=>{
    var form = new formidable.IncomingForm();
    let rootPath = path.join(__dirname, 'resource');
    // 设置默认上传目录
    form.uploadDir = rootPath;
    form.parse(req, function(err, fields, files) {
        if (err) return next(err);
        
        let filename = path.parse(files.pic.path).base;
        let dist = path.join(rootPath, fields.dir, filename);
        fse.move(files.pic.path, dist,(err)=>{
            if (err) return next(err);
            let db_file = `/resource/${fields.dir}/${filename}`;
            let db_dir = fields.dir;

            pool.getConnection((err,connection)=>{
                if(err) return next(err);
                connection.query('insert into album_file values (?,?)',
                    [db_file,db_dir],(error, results)=>{
                    connection.release();
                    if (err) return next(err);
                    res.redirect('/showDir?dir='+db_dir);
                })
            });
        })
    })
})







//处理静态资源
// /public/vender/bootstrap/js/bootstrap.js
app.use('/public', express.static('./public'));
//向外暴露相片静态资源目录
app.use('/resource', express.static('./resource'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
///中间件执行列表
app.use(router);


app.use((err, req, res, next) => {
    console.log('出错啦.-------------------------');
    console.log(err);
    console.log('出错啦.-------------------------');
    res.send(`
            您要访问的页面出异常拉...请稍后再试..
            <a href="/">去首页玩</a>
    `);
})



//开启服务器
app.listen(8888, () => {
    console.log('服务器启动了');
});