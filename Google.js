
/********************************
 Google搜索人机验证解决方案
 指定策略组并发测试版

 原作者：@NobyDa
 原版更新时间：2024/05/19

 修改内容：
 1. 不读取 BoxJs
 2. 固定指定 Google、𝗜nstagram 两个策略组
 3. 自动递归展开策略组内节点
 4. 节点去重
 5. 随机选择最多20个节点并发测试
 6. 首个 HTTP 200 响应胜出
*********************************/

const $ = new NobyDa_Tools();
$.ret = {};

// 固定指定的策略组名称
const TARGET_GROUPS = [
    'Google'
];

!(async () => {

    if (($response.status || $response.statusCode) == 200) return;

    const req = JSON.parse(JSON.stringify($request));
    const policy = await $.policy();

    let selected = [];

    if ($.isQuanX) {

        const groups = policy.groups || {};

        // 递归展开策略组及其嵌套策略组
        const expandGroup = (name, path = []) => {

            const group = groups[name];

            // 如果不是策略组，则视为具体节点
            if (!group) return [name];

            // 防止循环嵌套
            if (path.includes(name)) return [];

            const candidates = group.candidates || [];

            return candidates.flatMap(n =>
                expandGroup(n, [...path, name])
            );
        };

        // 只提取指定策略组内的节点
        selected = [...new Set(
            TARGET_GROUPS.flatMap(name => {

                if (!groups[name]) {
                    console.log(`[WARN]: Group "${name}" not found`);
                    return [];
                }

                return expandGroup(name);
            })
        )].filter(n =>
            n &&
            !['direct', 'proxy', 'reject'].includes(n) &&
            !groups[n]
        );

    } else {

        // 非 Quantumult X 环境保留原版筛选机制
        selected = [...policy.group, ...policy.proxy];
    }

    // 随机选择最多20个节点
    selected = [...new Set(selected)]
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

    console.log(`[INFO]: Selected nodes:\n${JSON.stringify(selected, null, 2)}`);

    if (!selected.length) {
        throw new Error('No available nodes in specified groups');
    }

    // 并发请求，最先返回HTTP 200的节点胜出
    await Promise.any([
        ...selected.map(
            (i) => new Promise((r, e) => {

                if (req.headers['User-Agent'])
                    req.headers.Cookie = `${Math.random()}`;

                if (req.headers['user-agent'])
                    req.headers.cookie = `${Math.random()}`;

                $.http[req.method.toLowerCase()]({
                    policy: i,
                    node: i,
                    opts: { policy: i },
                    ...req
                }).then((v) => {

                    if (v.status == 200) {

                        r({
                            policy: i,
                            body: {
                                ...v,
                                status: $.isQuanX
                                    ? 'HTTP/1.1 200'
                                    : 200
                            }
                        });

                    } else if (v.status == 429) {

                        e(console.log(
                            `[INFO]: Policy "${i}" need to CAPTCHA`
                        ));

                    } else {

                        e(console.log(
                            `[INFO]: Policy "${i}" unknown resp status "${v.status}"`
                        ));
                    }

                }).catch((err) =>
                    e(console.log(`[ERROR]: ${err}`))
                );
            })
        )
    ]).then((data) => {

        $.ret = data.body;

        console.log(`[INFO]: Use data from "${data.policy}"`);

    });

})()
    .catch((err) =>
        console.log(`[ERROR]: ${(err && err.message) || err}`)
    )
    .finally(() => $done($.ret));


function NobyDa_Tools() {

    this.isLoon = typeof $loon !== "undefined";

    this.isQuanX = typeof $configuration !== 'undefined';

    this.isSurge = typeof $environment !== 'undefined' &&
        $environment['surge-version'];

    this.isNode = typeof module !== 'undefined' && !!module.exports;

    this.http = Object.fromEntries(
        ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"].map(
            (m) => [m.toLowerCase(), (opts) => {

                if (this.isQuanX) return new Promise((resolve, reject) => {

                    $task.fetch({ method: m, ...opts })
                        .then((r) => resolve({
                            status: r.statusCode,
                            headers: r.headers,
                            body: r.body,
                        }), e => reject(e.error));

                });

                if (this.isSurge || this.isLoon || this.isNode)
                    return new Promise((resolve, reject) => {

                        const request = this.isNode
                            ? require("request")
                            : $httpClient;

                        request[m.toLowerCase()](opts, (e, r, b) => {

                            if (e) reject(e);

                            else resolve({
                                status: r.status || r.statusCode,
                                headers: r.headers,
                                body: b
                            });

                        });
                    });
            }]
        )
    );

    this.policy = () => {

        if (this.isSurge) return new Promise((r) => {

            $httpAPI("GET", "v1/policies", null, (v) => r({
                proxy: v.proxies,
                group: v['policy-groups']
            }));

        });

        if (this.isQuanX) return new Promise((r) => {

            $configuration.sendMessage({
                action: "get_customized_policy"
            }).then(b => {

                const groups = b.ret || {};

                r({
                    proxy: Object.keys(groups)
                        .reduce((t, i) => [
                            ...new Set([
                                ...t,
                                ...(groups[i].candidates || [])
                            ])
                        ], [])
                        .filter((v) =>
                            !groups[v] &&
                            !['direct', 'proxy', 'reject'].includes(v)
                        ),

                    group: Object.keys(groups),

                    // 保留每个策略组及其节点列表
                    groups: groups
                });

            }, () => r({
                proxy: [],
                group: [],
                groups: {}
            }));

        });

        if (this.isLoon) return new Promise(async (r1) => {

            const config = JSON.parse($config.getConfig());

            const groupData = await Promise.all(
                config['all_policy_groups'].map(
                    (i) => new Promise((r2) => {

                        $config.getSubPolicies(i, (b) => {
                            r2(JSON.parse(b || '[]'));
                        });

                    })
                )
            );

            r1({
                proxy: groupData.reduce((t, i) => [
                    ...new Set([
                        ...t,
                        ...i.filter((v) => {
                            return v.type == 'node' &&
                                !config['all_buildin_nodes'].includes(v.name);
                        }).map((n) => n.name)
                    ])
                ], []),

                group: config['all_policy_groups']
            });

        });

    };

}
