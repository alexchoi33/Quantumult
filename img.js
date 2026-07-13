let body = $response.body;


// 把图片链接 href 改成原图链接
body = body.replace(
/<a([^>]*?)data-pswp-src="(https:\/\/i\.postimg\.cc\/[^"]+)"([^>]*?)href="https:\/\/postimg\.cc\/[^"]+"/g,
'<a$1data-pswp-src="$2"$3href="$2"'
);


$done({
    body
});
