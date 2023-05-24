// change this when using as package
import FiveSimClient from "../clients/5sim.js";
import { print, retry } from "../utils.js";

async function ordersms({
  country = "india",
  service = "microsoft",
  timeout = 0.5, // in mins
  key = "your api key",
} = {}) {
  const sms = new FiveSimClient({
    key,
    defaults: {
      country,
      service,
      sort: "price_low",
      type: "activation",
    },
  });
  let full = {};
  let number = null;
  let order_id = null;

  const bal = await sms.getBalance();
  console.log(`Balance: `, bal);
  print(
    ` Trying to order sms | ${country.toUpperCase()} | ${service.toUpperCase()}`,
    true
  );
  await retry(async () => {
    const v = await sms.orderSMS();
    full = v;
    number = v?.phoneshort;
    order_id = v?.id;
  });

  async function waitforsms() {
    let code = null;
    if (!number || !order_id) {
      return;
    }

    print(" Waiting for code to arrive...", true);
    const data = await sms.checkSMS(order_id, {
      poll: true,
      timeout: timeout,
      cancel: true,
    });
    if (data.code) {
      code = data.code;
    }

    print();

    if (!code) {
      print(`Code wasn't grabbed within ${timeout} min, order cancelled`);
    } else {
      print(`Code: ${code}`);
    }
    return code;
  }

  if (number && order_id) {
    print(`Sms Order Successfull: ${country} | ${service}`);
    print(`Number: ${number} | OrderID: ${order_id}`);
  } else {
    print("Sms order failed");
  }

  return { sms, number, waitforsms, info: full };
}

(async () => {
  const a = await ordersms();
  await a.waitforsms();
})();
