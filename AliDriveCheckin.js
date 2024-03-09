/*
 * 本脚本旨在实现阿里云盘自动签到，支持Surge,stash,Loon,QuantumultX
 * @author: zqzess
 * 仓库地址：https://github.com/zqzess/rule_for_quantumultX
 * boxjs可以查看refresh_token
 * 获取token，打开阿里网盘即可获取，如果没有token获取通知，请先关闭阿里网盘，等待几秒重新开启阿里网盘。
 * 首次订阅脚本，请停止脚本工具运行再重新启动，使MITM生效
 * 本脚本已实现自动刷新token，只有第一次使用需要获取token，随后可关闭token获取，无需再次启用
 * 请使用boxjs来选择是否关闭自动领取奖励
 * 感谢@chavyleung提供的Env
 */


let title = 'AliDrive Checkin'
const keyName = 'ADriveCheckIn'
const $ = new Env(title, true)
let ADrivre = {
    authUA: '',
    xua: '',
    refresh_token_body: '',
    headers: '',
    refresh_token: '',
    isAutoGetReword: 'true'
}
ADrivreInfo = $.getjson(keyName) || ADrivre
$.isAutoGetReword = true
if(ADrivreInfo.isAutoGetReword===undefined || ADrivreInfo.isAutoGetReword==='')
    ADrivreInfo.isAutoGetReword = 'true'
if(ADrivreInfo.isAutoGetReword === 'false')
    $.isAutoGetReword = false
console.log('Auto Claim Reward：' + $.isAutoGetReword)
const authUrl = 'https://auth.aliyundrive.com/v2/account/token'
const checkInUrl = 'https://member.aliyundrive.com/v2/activity/sign_in_list'
const rewordUrl = 'https://member.aliyundrive.com/v1/activity/sign_in_reward?_rx-s=mobile'
if (typeof $request !== 'undefined') {
    $.log('🤖Fetch Token')
    GetRefresh_token()
} else if (!ADrivreInfo.refresh_token_body && !ADrivreInfo.headers) {
    if($.getdata('@ADrive.refresh_token'))
    {
        $.msg($.name, `脚本近期已更新，请重新获取token`, `请先更新boxjs选择是否关闭自动领取奖励，默认开启`);
    }else{
        $.msg($.name, ``, `token失效/未获取 ⚠️`);
    }
    $.done();
} else {
    $.log('🤖Checkin Operation')
    getAuthorizationKey()
}

function GetRefresh_token() {
    const body = JSON.parse($request.body)
    let xcanary = $request.headers['x-canary']
    let authUA = $request.headers['user-agent']
    let xdeviceid = $request.headers['x-device-id']
    let cookies = $request.headers['cookie']
    let headers = {'x-canary': xcanary, 'user-agent': authUA, 'x-device-id': xdeviceid, 'cookie': cookies}
    let refresh_token2 = body.refresh_token
    $.log('refresh_token: ' + refresh_token2)
    if (refresh_token2) {
        if (ADrivreInfo.refresh_token) {
            if (ADrivreInfo.refresh_token !== refresh_token2) {
                ADrivreInfo.refresh_token_body = body
                ADrivreInfo.refresh_token = refresh_token2
                ADrivreInfo.headers = headers
                let t = $.setjson(ADrivreInfo,keyName)
                if (t) {
                    $.msg('Refresh refresh_token Success 🎉', '', '')
                } else {
                    $.msg('Refresh refresh_token Fail‼️', '', '')
                }
            }
        } else {
            ADrivreInfo.refresh_token_body = body
            ADrivreInfo.refresh_token = refresh_token2
            ADrivreInfo.headers = headers
            let t = $.setjson(ADrivreInfo,keyName)
            if (t) {
                $.msg('首次写入阿里网盘refresh_token成功 🎉', '', '')
            } else {
                $.msg('首次写入阿里网盘refresh_token失败‼️', '', '')
            }
        }
    }
    $.done()
}

function getAuthorizationKey() {
    let option = {
        url: authUrl,
        headers: {
            'Content-Type': 'application/json',
            'accept': '*/*',
            'accept-language': 'zh-CN,zh-Hansq=0.9',
            'x-canary': ADrivreInfo.headers['x-canary'],
            'x-device-id': ADrivreInfo.headers['x-device-id'],
            'cookie': ADrivreInfo.headers['cookie'],
            'user-agent': ADrivreInfo.headers['user-agent']
        },
        body: JSON.stringify(ADrivreInfo.refresh_token_body)
    }
    $.log('Fetch Authorization')
    $.post(option, function (error, response, data) {
        if (error) {
            $.log('错误原因：' + error)
            $.msg(title, '❌签到失败', '刷新authorization失败')
            return $.done()
        } else if(!data)
        {
            $.log('没有获取到数据')
        }
        else {
            let body = JSON.parse(data)
            let refresh_token2 = body.refresh_token
            let accessKey = 'Bearer ' + body.access_token
            if (refresh_token2) {
                ADrivreInfo.refresh_token_body.refresh_token = refresh_token2
                ADrivreInfo.refresh_token = refresh_token2
                let t = $.setjson(ADrivreInfo,keyName)
                if (t) {
                    $.log('Refresh refresh_token Success 🎉')
                } else {
                    $.msg('Refresh refresh_token Fail ‼️', '', '')
                }
            }
            signCheckin(accessKey)
        }
    })
}

function signCheckin(authorization) {
    let date = new Date()
    let timeStamp = Date.parse(date)
    const xumt = 'defaultFY1_fyjs_not_loaded@@https://pages.aliyundrive.com/mobile-page/web/dailycheck.html@@' + timeStamp
    const url_fetch_sign = {
        url: checkInUrl,
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json, text/plain, */*',
            'authorization': authorization,
            'x-canary': ADrivreInfo.headers['x-canary'],
            'x-umt': xumt,
            'origin': 'https://pages.aliyundrive.com',
            'x-ua': xumt,
            'user-agent': ADrivreInfo.headers['user-agent'],
            'referer': 'https://pages.aliyundrive.com/'
        },
        body: JSON.stringify({})
    }
    $.log('Checkin Start')
    $.post(url_fetch_sign, function (error, response, data) {
        if (error) {
            $.log('错误：' + error)
            $.msg(title, '❌签到失败', '无法签到，请手动签到')
            $.done()
        } else if(!data)
        {
            $.log('没有获取到数据')
        }else {
            let body = JSON.parse(data)
            if(body.message!==null) {
                $.log('\n body.message内容打印\n')
                $.log(body.message)
                $.log('\n body.message不为空，脚本结束')
                $.msg(title, '❌签到失败', body.message)
                $.done()
            }
            const isSignIn = body.result.isSignIn
            let signInCount = Number(body.result.signInCount)
            let isReward = body.result.isReward
            let stitle = '🎉' + 'Checkin Success'
            let signInLogs = body.result.signInInfos
            $.log('Checkin Days: ' + signInCount)
            let reward = ''
            if(signInCount > 22 && !$.isAutoGetReword)
            {
                $.log('Please do not forget to claim reward')
                $.msg(title,'📅Tips','Please do not forget to claim reward')
            }
            signInLogs.forEach(function (i) {
                if (Number(i.day) === signInCount) {
                    if(i.status === 'normal')
                    {
                        if (i.rewards.length > 0 && i.rewards[0].status === 'verification') {
                            reward = 'Checkin ' + signInCount + ' Days Reward: ' + i.rewards[0].name + ' ' + i.rewards[0].rewardDesc
                            $.log('Checkin Reward: ' + reward)
                        }
                        else if (i.rewards.length > 0 && i.rewards[0].status === 'finished') {
                            reward = i.poster?.reason +'\n' + i.poster?.name
                            if(reward === 'undefined\nundefined') {
                                if($.isAutoGetReword)
                                {
                                    //reward = ''
                                    $.log('Checkin Done')
                                    getReword(authorization,signInCount)
                                    $.msg(title, stitle, signInCount +' Days', reward)
                                    if(!$.isAutoGetReword)
                                        $.log('⚠Auto claim reward off')
                                    //getReword(authorization,signInCount)
                                }else{
                                    reward = '❌Reward not claim, auto claim off'
                                    $.log('Reward not claim')
                                }
                            }
                        }
                    }
                }
            })
            /*if (isReward && reward) {
                $.msg(title, stitle, reward)
            }*/
            if(!isReward && reward){
                //stitle = '⚠️Alreday Checkin Today'
                $.msg(title, reward)
            }
            $.done()
        }
    })
}

function getReword(authorization,signInCount){
    $.log('Start Auto Claiming Reward')
    const date = new Date()
    let timeStamp = Date.parse(date)
    let xumt = 'defaultFY1_fyjs_not_loaded@@https://pages.aliyundrive.com/mobile-page/web/dailycheck.html@@' + timeStamp
    let url_fetch_reword = {
        url: rewordUrl,
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json, text/plain, */*',
            Authorization: authorization,
            'x-canary': ADrivreInfo.headers['x-canary'],
            'x-umt': xumt,
            'origin': 'https://pages.aliyundrive.com',
            'x-ua': xumt,
            'user-agent': ADrivreInfo.headers['user-agent'],
            'referer': 'https://pages.aliyundrive.com/'
        },
        body: JSON.stringify({
            "signInDay": signInCount
        })
    }
    $.log('Start Claiming Reward')
    $.post(url_fetch_reword, function (error, response, data) {
        if (error) {
            $.log('错误：' + error)
            $.msg(title, '❌自动领取奖励失败', '自动领取奖励失败，请手动领取')
            $.done()
        } else if(!data)
        {
            $.log('没有获取到数据')
        }else {
            let body = JSON.parse(data)
            if(!body.success) {
                $.log('❌自动领取奖励失败')
                $.msg(title, '❌自动领取奖励失败', '自动领取奖励失败，请手动领取')
                $.done()
            }
            console.log('body.result:\n' + body.result)
            const rewordName = body.result.name
            const rewordDescription = body.result.description
            let finalResult = rewordDescription
            if (rewordDescription === '' || rewordDescription === undefined)
                finalResult = rewordName
            $.log('rewordName: ' + rewordName)
            $.log('rewordDescription: ' + rewordDescription)
            console.log('Auto claim reward done, reward: ' + rewordDescription)
            $.msg(title,'Checkin Success! Auto Claim Reward','with: ' + finalResult)
            $.done()
        }
    })
}

/*********************************
 * environment
 * ********************************
 */
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `\ud83d\udd14${this.name}, \u5f00\u59cb!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), a = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(a, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t) { let e = { "M+": (new Date).getMonth() + 1, "d+": (new Date).getDate(), "H+": (new Date).getHours(), "m+": (new Date).getMinutes(), "s+": (new Date).getSeconds(), "q+": Math.floor(((new Date).getMonth() + 3) / 3), S: (new Date).getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, ((new Date).getFullYear() + "").substr(4 - RegExp.$1.length))); for (let s in e) new RegExp("(" + s + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? e[s] : ("00" + e[s]).substr(("" + e[s]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))); let h = ["", "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="]; h.push(e), s && h.push(s), i && h.push(i), console.log(h.join("\n")), this.logs = this.logs.concat(h) } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t.stack) : this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
