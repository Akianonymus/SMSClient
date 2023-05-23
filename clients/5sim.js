import { print, request, wait } from "../utils.js";

const API_URL = "https://5sim.net/v1";

const formbaseurl = (...paths) => {
  let url = API_URL;
  paths.forEach((v) => {
    url += `/${v}`;
  });
  return url;
};

class FiveSimClient {
  constructor({
    key,
    defaults: {
      country,
      service,
      sort = "price_low",
      type = "activation",
    } = {},
  }) {
    if (!key) {
      throw Error("Key Not Provided");
    }
    if (typeof key !== "string" || key?.trim() === "") {
      throw Error("Invalid Key");
    }

    switch (type) {
      case "hosting":
      case "activation":
        break;
      default:
        throw Error("Invalid type");
    }

    switch (sort) {
      case "price_low":
      case "price_high":
      case "success_high":
      case "success_low":
        break;
      default:
        throw Error("Invalid sort method");
    }

    this.country = country;
    this.service = service;
    this.sort = sort;
    this.type = type;
    this.category = type;
    this.key = key;

    this.countries = {};
    this.fetchcountries = this.getCountries().then((data) => {
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const e = data[key];
          const pre = Object.keys?.(e?.prefix)?.[0];
          if (pre) this.countries[key] = pre;
        }
      }
    });
  }

  async req(config) {
    if (!config.headers) config.headers = {};
    config.headers.Authorization = `Bearer ${this.key}`;
    config.headers.Accept = `application/json`;

    let data = {};
    await request(config)
      .then((res) => {
        data = res.data;
      })
      .catch((e) => {
        data = e;
      });
    return data;
  }

  async getUserInfo() {
    return await this.req({
      url: formbaseurl("user/profile"),
    });
  }

  async getBalance() {
    const data = await this.getUserInfo();
    return data?.balance;
  }

  async getCountries() {
    return await this.req({
      url: "https://5sim.net/v1/guest/countries",
    });
  }

  /* 
   {
     "Data": [
       {
         "id":53533933,
         "phone":"+79085895281",
         "operator":"tele2",
         "product":"aliexpress",
         "price":2,
         "status":"BANNED",
         "expires":"2020-06-28T16:32:43.307041Z",
         "sms":[],
         "created_at":"2020-06-28T16:17:43.307041Z",
         "country":"russia"
       }
     ],
     "ProductNames":[],
     "Statuses":[],
     "Total":3
   } 
   */
  async getHistory({ category, limit, offset, order, reverse } = {}) {
    category = category || this.category;
    if (!category) {
      print("Error: Missing category");
      return;
    }

    limit = limit || this.limit;
    offset = offset || this.offset;
    order = order || this.order;
    reverse = reverse || this.reverse;

    return await this.req({
      url: formbaseurl("user/orders"),
      params: { category, limit, offset, order, reverse },
    });
  }

  async getPrice({ country, service, sort } = {}) {
    country = country || this.country;
    service = service || this.service;
    sort = sort || this.sort || "price_low";

    const info = await this.req({
      url: formbaseurl("guest/prices"),
      params: {
        product: service,
        country,
      },
    });

    if (typeof info === "string") {
      if (info.match(/country/i))
        return { error: info, status: "Invalid Country" };
      if (info.match(/product/i))
        return { error: info, status: "Invalid service" };
    }

    if (!info?.[country]) {
      return { error: info, status: "Invalid Country" };
    }

    if (!info?.[country]?.[service]) {
      return { error: info, status: "Invalid service" };
    }

    const data = info[country][service];
    let operator = null;
    let price = null;
    let rate = null;
    switch (sort) {
      case "price_low":
        price = Infinity;
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            const e = data[key];
            if (e?.cost < price) {
              operator = key;
              price = e.cost;
              rate = e.rate;
            }
          }
        }
        break;
      case "price_high":
        price = 0;
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            const e = data[key];
            if (e?.cost > price) {
              operator = key;
              price = e.cost;
              rate = e.rate;
            }
          }
        }
        break;
      case "success_high":
        rate = 0;
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            const e = data[key];
            if (e?.rate > rate) {
              operator = key;
              rate = e.rate;
              price = e.cost;
            }
          }
        }
        break;
      case "success_low":
        rate = Infinity;
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            const e = data[key];
            if (e?.rate < rate) {
              operator = key;
              rate = e.rate;
              price = e.cost;
            }
          }
        }
        break;
    }

    return { operator, price, rate };
  }

  async orderSMS({ country, service, sort, type } = {}) {
    country = country || this.country;
    service = service || this.service;
    sort = sort || this.sort;
    type = type || this.type;

    if (!country || !service || !sort || !type) {
      print("Error: Missing args");
      return { error: "Missing args" };
    }

    const info = await this.getPrice({ country, service, sort });
    if (info?.error) {
      return info;
    }

    try {
      const { operator, price, rate } = info;
      const data = await this.req({
        url: formbaseurl("user/buy", type, country, operator, service),
      });
      await this.fetchcountries;
      data.prefix = this.countries?.[country];
      data.phoneshort = data.phone.slice(data.prefix.length);
      return data;
    } catch {
      return { error: "Error" };
    }
  }

  async checkSMS(orderid, { poll, timeout, cancel } = {}) {
    if (!orderid) {
      print("MIssing order id");
      return;
    }

    if (!poll) {
      return await this.req({
        url: formbaseurl("user/check", orderid),
      });
    }

    let full = {};
    let code = null,
      exit = false;
    const to = setTimeout(() => {
      exit = true;
    }, timeout * 60 * 1000);

    while (!exit && !code) {
      await wait(2000);
      await this.checkSMS(orderid)
        .then((v) => {
          full = v;
          switch (v?.status) {
            case "RECEIVED":
              break;
            case "CANCELED":
            case "BANNED":
              exit = true;
              break;
            case "FINISHED":
              code = v?.sms?.[0]?.code;
              exit = true;
              break;
          }
        })
        .catch(() => {
          exit = true;
        });
    }
    clearTimeout(to);
    if (!code && cancel) {
      try {
        return await this.cancelSMS(orderid);
      } catch {}
    }
    return full;
  }

  async cancelSMS(orderid) {
    if (!orderid) {
      print("MIssing order id");
      return;
    }

    return await this.req({
      url: formbaseurl("user/cancel", orderid),
    });
  }

  async cancelAll() {
    const orders = await this.getHistory();
    const data = orders?.Data;
    if (orders?.Total <= 0 || !data) {
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const e = data[i];
      if (e?.status === "RECEIVED" && e?.id) {
        await this.cancelSMS(e.id);
        await wait(1000);
      }
    }
  }
}

export default FiveSimClient;
