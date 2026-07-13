let body = $response.body;

const inject = `
<script>
(function(){

const realOpen = window.open;

// 允许的域名
const allow = [
    "postimg.cc",
    "i.postimg.cc"
];

window.open = function(url){

    if(typeof url==="string"){

        if(allow.some(v=>url.includes(v))){
            return realOpen.apply(this,arguments);
        }

        console.log("Blocked:",url);
        return null;
    }

    return realOpen.apply(this,arguments);
};

// 拦截所有点击
document.addEventListener("click",function(e){

    const a=e.target.closest("a");

    if(!a)return;

    const href=a.href||"";

    if(
        href &&
        !href.includes("postimg.cc") &&
        !href.includes("i.postimg.cc")
    ){

        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();

        return false;
    }

},true);

// 删除动态 iframe
new MutationObserver(function(){

    document.querySelectorAll("iframe").forEach(v=>v.remove());

}).observe(document,{childList:true,subtree:true});

})();
</script>
`;

body=body.replace("</body>",inject+"</body>");

$done({body});
