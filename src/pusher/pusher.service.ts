import { Injectable } from "@nestjs/common";
const Pusher = require("pusher");

@Injectable()
export class PusherService {
  private pusher: any;

  constructor() {
    this.pusher = new Pusher({
      appId: process.env.pusher_appId,
      key: process.env.pusher_key,
      secret: process.env.pusher_secret,
      cluster: process.env.pusher_cluster,
      useTLS: true,
    });
  }

  trigger(channel: string, event: string, data: any) {
    return this.pusher.trigger(channel, event, data);
  }
}
