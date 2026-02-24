# API 文档

服务器地址：<https://receipt-api.nitro.xin>

## 约定

- 所有成功的返回200
- 客户端问题返回400，Body是Text格式，错误信息
- 服务端问题返回500，Body是Text格式，错误信息

## 验证CDK

```http
POST /cdks/public/check
HTTP/1.1
Content-Type: application/json
X-Product-ID: chatgpt

{
    "code": "1234567890"
}

200 OK:
json: {
    "code": "1234567890",
    "used": true,
    "app_name": "ChatGPT",
    "app_product_name": "Plus 1M",
}
```

## 出库

- 出库前建议先验证CDK和ChatGPT账户是否满足要求
- 新：由于客户端可能随时取消，导致流程被中断，改成任务方案，老接口提交任务，返回TaskID，再新增结果轮询的接口。
- 另外：因为CDK包含Product信息， X-Product-ID 在这个接口里可加可不加。

```http
POST /stocks/public/outstock
HTTP/1.1
Content-Type: application/json

{
    "cdk": "1234567890",
    "user": "1234567890"
}

200 OK：
text: fa3c8cbf-686c-4a24-9983-c2e94e1d28b1

> UUID，也是task_id
```

### 查询任务状态

- 轮询频率的话，10秒一次吧

```http
GET /stocks/public/outstock/{task_id}
HTTP/1.1

200 OK：
JSON: {
    "task_id": "fa3c8cbf-686c-4a24-9983-c2e94e1d28b1",
    "cdk": "SNDJSBLMKLO",
    "pending": false, # true: 任务还在进行中
    "success": true, # 是否成功
    "message": string | undefined # 如果失败，错误信息
}
```

## 查询CDK使用状态

- codes: CDK列表，用英文逗号分隔，注意URL编码

```http
GET /public/check-usage/:codes
HTTP/1.1
Content-Type: application/json

200 OK:
json: {
    code: "1234567890",
    used: true,
    app_name: "ChatGPT",
    user: "xxxxxxx@gmai.com",
    redeem_time: "2025-01-01 07:00:00"
}
```
