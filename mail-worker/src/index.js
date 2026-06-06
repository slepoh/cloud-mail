import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import kvObjService from './service/kv-obj-service';
import oauthService from "./service/oauth-service";
import analysisService from './service/analysis-service';
export default {
	 async fetch(req, env, ctx) {

		const url = new URL(req.url)

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		 if (['/static/','/attachments/'].some(p => url.pathname.startsWith(p))) {
			 return await kvObjService.toObjResp( { env }, url.pathname.substring(1));
		 }

		return env.assets.fetch(req);
	},
	email: email,
	async scheduled(c, env, ctx) {
		// 每 30 分钟：刷新分析缓存
		await analysisService.refreshEchartsCache({ env })
		
		// 每 30 分钟检查是否需要执行每日任务（UTC 时间每天 16 点是北京时间 0 点）
		const now = new Date()
		if (now.getUTCHours() === 16 && now.getUTCMinutes() < 30) {
			await verifyRecordService.clearRecord({ env })
			await userService.resetDaySendCount({ env })
			await emailService.completeReceiveAll({ env })
			await oauthService.clearNoBindOathUser({ env })
		}
	},
};
