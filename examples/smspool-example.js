// change this when using as package
import SMSPoolClient from "../client/smspool.js";
import { print, retry } from "../utils.js";

async function ordersms({
  country = "IN",
  service = "Microsoft",
  timeout = 0.5, // in mins
  key = "your api key",
} = {}) {
  const smspool = new SMSPoolClient({ key, defaults: { country, service } });
  let full = {};
  let number = null;
  let order_id = null;

  print(` Trying to order sms | ${country} | ${service}`, true);
  await retry(async () => {
    const v = await smspool.orderSMS(country, service);
    full = v;
    number = v?.phonenumber;
    order_id = v?.order_id;
  });

  async function waitforsms() {
    if (!number || !order_id) {
      return;
    }

    print(" Waiting for code to arrive...", true);
    const a = await smspool.checkSMS(order_id, {
      poll: true,
      timeout: timeout,
      cancel: true,
    });
    print("", true);
    print(a);
  }

  if (number && order_id) {
    print(`Sms Order Successfull: ${country} | ${service}`);
    print(`Number: ${number} | OrderID: ${order_id}`);
  } else {
    print("Sms order failed");
  }

  return { smspool, number, waitforsms, info: full };
}

(async () => {
  const a = await ordersms();
  await a.waitforsms();
})();
