<?php
header("Access-Control-Allow-Origin:*");
header('Content-type:application/json; charset=utf-8');

$tel = isset($_GET['tel']) && $_GET['tel'] != '' ? $_GET['tel'] : exit(json_encode(['success' => false, 'message' => '参数不完整'], JSON_UNESCAPED_UNICODE));
strlen($tel) != 11 && exit(json_encode(['success' => false, 'message' => '手机号码不正确'], JSON_UNESCAPED_UNICODE));
// 百度的
$_KEYRES = getKD('https://miao.baidu.com/abdr', 'eyJkYXRhIjoiMzZmNGY3MGY3MzA5YTA0MDFlNTQyNDRjYmVlZmNmMjU5ZWJjYjZkMzUxYmY4NDVlZTgwMDI4OGVlOWYzZWFkODAyNGFhZmUzOGNkNDBjNmExZGIyZmQzOGI5OWFiM2E3ODhmYmJlY2I5ZTliMWU4YmRkNmM1MmQ1OTI1ZDNkMDcyNjE0NGNiMDQxNzRkMzE1OTBmYWFmZDEwN2U4NmEzNjk1N2I1ODExMjEzMzllYmFlYWE3NjY2YzcwMjAwOTNhMGQ3Mjk5OWM4MmRkNGY1ZDU0OWE0MWIxMjdiYmJhOTg1ODQ5MDcwODNhZTAxZjhmMzY2OTI1MzQwZDA4NzlmZWRjZGE1YTdhZWMzNDFlYmNkMTBhOTU0MGVkMDM0NjIzZDg3MDg5OTY0NzU2NDQyY2E3YmIwYzIwMGI5OGIzY2NmZjNhNjAzMzY1MGYzMWUxYWRjZDUyZTI0YzlhZjRmMGQyM2E5ODY3MDQ2YjhhNjVlYzNkNjNiMDlmYjUyZTkzZTI5OGFiZDlhOTY4NDE3ZmYxODEwY2I1NWViODQyOGFlNTUyNDU2NjYzODQ5NjMwYjBkYWY1ODljMWRiMWFhMDM3MGUyYWJjZmE3MzU0ODY4OWE1Mjc5ODhlOTMxZjk3Mzc1MjJlYjg5NWM1YjVjMDJjYTNmYWFlNzJjMDIzZDdkY2NhOTExZmMyMmFmOGJhMmQ4MzgzYWZkY2Q2OTVkOWZmNDE4ZGUyODA4NzIxOTBhOTY2MGMyNjBhYmQ1ZDFjOWIxOWQ2OTNlNjFjMmMzOGQ2ZDNmYWU0N2JiMmRiNzUwNDhjYjk0NWIyY2YyNjA3NWVmNDk1MTYwOGY5OTkxYjcwYjEyMTYzZDM1MDc3ZTM0NmEwODZmYTYzNmQ0NGEwMDEzODk1NWU2OGE1NGM1YTUxY2Y4ZGI3MDkyNjJjNjZlNWFhYmFiNGZiOGQ4MWU0ODI1NjAxNWY1OTc3ZTNlODAzMzY5OTJhYWJjZDc2NjU2MzZkOGJiMTFiZjQzYzkyNTM1MWMxY2VmNjk3N2FjNDNhNjc2NDE3MzQ4ZjQ0MzEwYWNiMDVmMzQ3Yzk2MmRkY2FiZDRhNTIyOTRjYzZmODA4NDJhMDU4MjAzNzY4MTE3NTUxZmIzN2M2ZmNiMjFhNmIxODI0MzViNzIzMTEzYzYwMjFjNDA1YjcwYzBhZTg2Njc5YzRiZTIwNTEwNGY3OGFhNjg5ZDFhOTAwMTQwMmY0NWY5ZjU2NmUxMDRhOTI1YzI5YTFkMGE4MjZlNWUwZjkxYTAzMDRlYjZmNzkwMjE3Y2Q2N2NmYjVjMGQyN2FmNTg3Y2Y4MzU4ZmQxYzU1NDc2NmM4OTczYzUxY2Y5NDhiNTI1Yjk5ODBhZjFmZTM2ODRiN2FkOTkwZWNlMmVkMTljZTJjMDU5ZmZmMzU1YTFiZDcwOTRjMzFiM2Y3MzJmMTY5YTY2N2Y3ZDI5NDljYmFiMWY5OGFlMTViMGI2MjQzYmI3N2ViNDEwY2FlYmNlYzY3OTAyZGY2ZDdlMGEwYTc3NmM2MTRkMDc2ODgwMzRmMTI0YTVkMDE5MWVlMzZiMjVhZGU2MzQxNmE0NzI0YzhmY2E2ZTExNjQ0MGE2NTk1ZGZjZmZmMTc4Zjg1YWI1NzgxYjVlYjEyNzA2ZWM0MmRiYjU5ZmE2M2Y2NDc2NzdiMjI2NjU0YzA5OTM1YzM3ODdiYzEyY2RlNjU2Mzg5MjI2ZjYyZDMwODQ3ZTk4ZDUwMzUxY2VkNTE5NWNiMTM4ZmQzZWYwZjMwNmVhODE3MGJiOWE2MjIwZTJjYzliNTk1NWQ0NmFkYzliZjNiODBkN2E3N2E1ZjBiN2NkNDZhYTEyZjk5MTNiNTE5ZjQ5NzNiZDU3NWU0NjAzY2E0NzBjNmYyODhkNGQwMmMwZWRjYTA1OTE2ZjNjYzExNmRiMjdhYzJmZjUyNDhmZjQwYTUyY2YyOWVlMDA0NGQ2YWQwNGI0Yzk0NDI5MWQ0MjNkZWNhYTliYmQ2ZGYxOTYxNTRlMzE3OTAxOTNhY2JkZjcxYjk3ZDU3Y2JkMjI4OGIyNjkzZjBkMjE0MGVkMjg3NzE3NGMyYzNiYWE0ZmZiYTU3OTczMGQ1MzU1MWI1NDA4NDZkYjkzNWU2Zjg5ZGIwZGZiN2VkMzY3Y2Y3OTdlNTdjNTViOTI2NmIzNGNiNjY4Njc2ZTVkNzdiZDI1MjgwMTg3ZjM1YzNmNjJmZmY5MzE0Y2NjOGFhMmI4MzEzMGJlZDhhZjY3Mzc4MDMxZDBmZDExZDQ4NDc3ZDk2ZjY3YTBiZTQyNzBkMzkwZmZjYWVjYmU0YWU2MjE4Y2I4ZWFjYWViN2M3YzgyZjBiOGU3OTRjMGU2NTFiNWM5YjQ2NmIwNGEwNmVmNThlMzg4ZTNjNmQ4NzZkYjExMWNiZTJmOWRmMGNkMTA4NWI5NGMxZGUxZjJhZGUwMWUxMDY4ZTVjZTI3ZTI2Y2ZlMWI5MTI2NDZlMGNiNGFjMjdiZTFkZTkxYjRlN2U4MjVkNTgyMzFiMDE4N2ZiODRiZTUyN2ZhMDAxZTU4YzkzNTQ3NDM2YzA5NzYzODNhNDA5YzNhMzA0MGYzNzA4ZDM4ZWQzZWM1NDgyZmVlNzJiMjNlYjZmYzk0NjZlZjU1YzVmMDVmZDBiNDkyNWY1NmMyOTY3Yjc0MjAxY2I1YjZjY2E4MWJiMWViODE1ZjUxYTFmZjI5YThjOTk5YWZkZTIyNTZlNDA2ZjhmNTRmZGE1YTBmNzA2OGY1YzY3NWM5OGU0ODQ5M2I1M2I2MmUyYWU5YzkyNmM4NjQ4MmU2M2M4ZmM5NGVhMTVjOTU1OTUxNDdhMzRmNDk1OWZhNjhhMmZkODJkZmQzZjY4ZTBiYWE0NWYxYTRlNDBiN2I0Y2UwZTZkNTc1MDYyZWVkNDQ5ZjM1ODMxOGNlZDkzMzRjODQzNzk0OTE5MDc1NTI4MDU4Yjg0NGVhZDEzMTM0ZjAzYjgxNDRhZWZhNWUwYjUzNTdmNjc3ZWQ5NjIyZjhkZThlNzE3NjJjZTNkYmU3NjUxNzkzMWFkNjJmZGU0YzBiMGViMjJjZjY4NjEwMzBlNWQwNDlhOWU3NTE3ZWFiYTRiMmYwNTE0Mzc2NGNlZGZiZTMyNWY1Zjk1NWQwMTQzZGJkMDkyZWNkMTExYjdhOWIxMTZiNjVjMTc1ZmM1N2EwNDFkMWFjYjExYjIxYWJkZmMzNzVlOWIxMTcyNGQ4YjI0YzYxN2IzNjAwN2ViZGY0OThkYWYxMDJhNTM4MjA0OTIyZDVlYzYwMWRlYjUwZWNiYzViNGEwMmM1YzlkNDc4MzE5ODE3MmJhYmQ2ZDkxYjIyOTFlNTE0YTBlOTJhOTdmNzFlZjYxNjFkNTY3ZGQ2YWY0NTkzZjQ1ZDU3NDQzNGNmNzg1NjY1ZjRlMDM5YjA1ZDY0Y2MxYjkwZjIyMGIwNDYyMTEzNWM4NDc0YjY0ZjY1NTE1ZjZjYjdjMTAyZGVlNDc3OTI2YmY2YzlmM2VlYzNlYzhmOTFhYTIzZSIsImtleV9pZCI6Ijc4YTk1Mzc1ZTMwNDQ4ZTQifQ==');
$_postD = json_decode($_KEYRES, true);
$_postD['search'] = $tel;
$_postD['user_search'] = "";
$_PHONERES = getKD('https://mhaoma.baidu.com/api/v1/search?appkey=9ef446ebde00e7303b32aca6', json_encode($_postD));
// 蛙蛙的
$_wawaZX = getKD('https://www.iamwawa.cn/home/saoraodianhua/ajax', ['phone' => $tel]);
$wawaJson = json_decode($_wawaZX, true)['status'] == '1' ? '骚扰电话' : '正常号码';
$_resJSON = json_decode($_PHONERES, true)['data'];
// 搜狗的
$_sougouRes = getSouGouRes($tel);
preg_match_all('/vr\((.*?);\}\);/i', $_sougouRes, $_sougouResArr);
$__arr = explode(',', str_replace('\'', '', $_sougouResArr[1][0]));
$_sougouRes = explode('：', $__arr[4]);
$_sougouOr = $_sougouRes[1] ? $_sougouRes[1] . '电话' : '正常号码';
$res_arr = ['success' => true, 'tel' => $tel, 'info' => ['province' => $_resJSON[$tel]['location']['province'], 'city' => $_resJSON[$tel]['location']['area'][0]['city'], 'operator' => $_resJSON[$tel]['location']['operator']], 'data' => [['name' => '360手机卫士', 'msg' => $wawaJson], ['name' => '搜狗号码通', 'msg' => $_sougouOr], ['name' => '百度手机卫士', 'msg' => $_resJSON[$tel]['reports'][0]['id'] ? $_resJSON[$tel]['reports'][0]['name'] : '正常号码']]];
exit(json_encode($res_arr, JSON_UNESCAPED_UNICODE));
function getSouGouRes($tel)
{
    $url = "https://www.sogou.com/web?query={$tel}";
    $ip = rand(0, 255) . '.' . rand(0, 255) . '.' . rand(0, 255) . '.' . rand(0, 255);
    $header[] = "accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9";
    $header[] = ":authority: www.sogou.com";
    $header[] = "accept-language: zh-CN,zh;q=0.9";
    $header[] = 'sec-ch-ua: " Not;A Brand";v="99", "Google Chrome";v="97", "Chromium";v="97"';
    $header[] = "upgrade-insecure-requests: 1";
    $header[] = "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36";
    $header[] = "CLIENT-IP:" . $ip;
    $header[] = "X-FORWARDED-FOR:" . $ip;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url); //设置传输的 url
    curl_setopt($ch, CURLOPT_HTTPHEADER, $header); //发送 http 报头
    curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1"); //设置UA
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HEADER, 1); //返回response头部信息
    curl_setopt($ch, CURLOPT_ENCODING, 'gzip,deflate'); // 解码压缩文件
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE); // 对认证证书来源的检查
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE); // 从证书中检查SSL加密算法是否存在
    curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 设置超时限制防止死循环
    $output = curl_exec($ch);
    curl_close($ch);
    return str_replace(["\n", "\t", "\r", ' '], '', $output);
}

function getKD($url, $postDDAT)
{
    $ip = rand(0, 255) . '.' . rand(0, 255) . '.' . rand(0, 255) . '.' . rand(0, 255);
    $header[] = "Accept: */*";
    $header[] = "Accept-Encoding: gzip, deflate, br";
    $header[] = "Accept-Language: zh-CN,zh;q=0.9";
    $header[] = "Connection: keep-alive";
    $header[] = "CLIENT-IP:" . $ip;
    $header[] = "X-FORWARDED-FOR:" . $ip;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url); //设置传输的 url
    curl_setopt($ch, CURLOPT_HTTPHEADER, $header); //发送 http 报头
    curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1"); //设置UA
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_ENCODING, 'gzip,deflate'); // 解码压缩文件
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE); // 对认证证书来源的检查
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE); // 从证书中检查SSL加密算法是否存在
    curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 设置超时限制防止死循环
    curl_setopt($ch, CURLOPT_POST, 1); //设置POST发送数据
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postDDAT); //发送POST数据内容  小马博客 www.xiaomaw.cn
    $output = curl_exec($ch);
    curl_close($ch);
    return $output;
}