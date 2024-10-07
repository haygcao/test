<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>手机号码查询接口_xfubk</title>
    <style>
        /* 设置全局样式 */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        /* 设置页面背景和字体 */
        body {
            font-family: 'Microsoft YaHei', sans-serif;
            background-color: #f8f8f8;
        }
        
        /* 设置容器样式 */
        .container {
            width: 100%;
            max-width: 1000px;
            margin: 20px auto;
            background-color: white;
            border-radius: 5px;
            box-shadow: 0px 0px 10px #aaa;
            overflow: hidden;
        }
        
        /* 设置标题样式 */
        h1 {
            font-size: 32px;
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #ccc;
            margin-bottom: 40px;
        }
        
        /* 设置输入框和按钮样式 */
        .input-container {
            display: flex;
            margin-bottom: 20px;
            justify-content: center;
        }
        
        input[type="text"] {
            padding: 10px 15px;
            font-size: 16px;
            border: 1px solid #ccc;
            border-radius: 5px 0px 0px 5px;
            outline: none;
            width: 250px;
            transition: all 0.3s ease-out;
        }
        
        input[type="text"]:focus {
            box-shadow: 0px 0px 5px #4caf50;
            border-color: #4caf50;
        }
        
        .button {
            background-color: #4CAF50; /* Green */
            color: white;
            padding: 10px 20px;
            font-size: 16px;
            border: none;
            border-radius: 0px 5px 5px 0px;
            cursor: pointer;
            transition: all 0.3s ease-out;
        }
        
        .button:hover {
            opacity: 0.8;
        }
        
        /* 设置表格样式 */
        table {
            width: 90%;
            margin: 0 auto;
            border-collapse: collapse;
            margin-top: 20px;
            margin-bottom: 20px;
        }
        
        th, td {
            border: 1px solid #ccc;
            padding: 10px;
            text-align: center;
        }
        
        th {
            background-color: #f2f2f2;
        }
        
        tbody{
            width: 100%;
        }
        
        /* 设置输出块样式 */
        pre {
            margin-top: 20px;
            padding: 20px;
            background-color: #eee;
            border-radius: 5px;
            font-family: Consolas, Courier, monospace;
            font-size: 14px;
            overflow: auto;
        }
        p {
            text-align: center;
            margin-bottom: 15px;
        }
    </style>
</head>

<body>
<div class="container">
    <h1>骚扰电话查询</h1>
    <div class="input-container">
        <input type="text" id="tel" placeholder="请输入手机号码" />
        <button class="button" id="search">查询</button>
    </div>
    <p>输入手机号查询是否是骚扰电话！查询结果来源360，百度，搜狗。xfubk . <a href="https://suyanw.cn" target="_blank">素颜</a></p>
    
    
</div>
<div class="container" id="result" style="display:none;width: 100%;">
<table >
        <tr>
            <th>查询项目</th>
            <th>查询结果</th>
        </tr>
        <tr>
            <td>手机号码</td>
            <td id="tel-result"></td>
        </tr>
        <tr>
            <td>归属地</td>
            <td id="info-result"></td>
        </tr>
        <tr>
        <thead></thead>
         <tbody id="data-result"></tbody>
        </tr>
    </table>
    <pre id="noresult" style="display:none">查询结果为空</pre>
    </div>
<script>
    // 获取输入框和按钮元素
    var telInput = document.getElementById('tel');
    var searchBtn = document.getElementById('search');
    // 获取结果元素
    var telResultEle = document.getElementById('tel-result');
    var infoResultEle = document.getElementById('info-result');
    var dataResultEle = document.getElementById('data-result');
    var noResultEle = document.getElementById('noresult');
    var resultTable = document.getElementById('result');

    // 搜索按钮点击事件处理程序
    searchBtn.onclick = function () {
        // 获取手机号码
        var tel = telInput.value.trim();
        // 判断手机号码是否为空
        if (tel === '') {
            alert('请输入手机号码');
            return;
        }
        // 发送请求
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var res = JSON.parse(xhr.responseText);
                        showResult(res);
                    } catch (e) {
                        alert('服务器返回的数据格式不正确');
                    }
                } else {
                    alert('请求失败，错误码：' + xhr.status);
                }
            }
        };
        xhr.open('GET', '/api.php?tel=' + tel);
        xhr.send();
    };

    // 显示结果
    function showResult(res) {
        // 判断查询结果是否为空
        if (Object.keys(res).length === 0) {
            resultTable.style.display = 'none';
            noResultEle.style.display = 'block';
            return;
        }

        // 显示查询结果
        resultTable.style.display = 'block';
        noResultEle.style.display = 'none';

        // 显示手机号码
        telResultEle.innerText = res.tel;
        // 显示归属地
        var info = res.info.province + ' ' + res.info.city + ' ' + res.info.operator;
        infoResultEle.innerText = info;
        // 显示其他信息
        var dataList = res.data;
        for (var i = 0; i < dataList.length; i++) {
            var data = dataList[i];
            var tr = document.createElement('tr');
            var tdName = document.createElement('td');
            var tdMsg = document.createElement('td');
            tdName.innerText = data.name;
            tdMsg.innerText = data.msg;
            tr.appendChild(tdName);
            tr.appendChild(tdMsg);
            dataResultEle.appendChild(tr);
        }
    }
</script>
</body>
</html>
