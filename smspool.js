import { request, print, wait } from "./utils.js";

const API_URL = "https://api.smspool.net";

const formbaseurl = (...paths) => {
  let url = API_URL;
  paths.forEach((v) => {
    url += `/${v}`;
  });
  return url;
};

/**
 * @class SMSPoolClient
 */
export class SMSPoolClient {
  constructor({ key, defaults: { country, service, pool, max_price } = {} }) {
    if (!key) {
      throw Error("Key Not Provided");
    }
    if (typeof key !== "string" || key?.trim() === "") {
      throw Error("Invalid Key");
    }

    this.country = country;
    this.service = service;
    this.pool = pool;
    this.max_price = max_price;
    this.key = key;
    this.countries = new Set();
    this.services = new Set();
    this.fetchcountries = this.getCountries().then((data) => {
      data?.forEach((v) => {
        this.countries.add(v.name);
        this.countries.add(v.short_name);
      });
    });
    this.fetchservices = this.getServices().then((data) => {
      data?.forEach((v) => {
        this.services.add(v.name);
      });
    });
  }

  async req(config) {
    if (!config.params) config.params = {};
    config.params.key = this.key;

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

  /**
   * @returns async [{ ID: "1", name: "United States", region: "Americas" }]
   */
  async getCountries() {
    return await this.req({
      url: formbaseurl("country/retrieve_all"),
    });
  }

  /**
   * @returns async [ { ID: "1", name: "1688" }, { ID: "2", name: "1Q" } ]
   */
  async getServices() {
    return await this.req({
      url: formbaseurl("service/retrieve_all"),
    });
  }

  /**
   * @returns async {"balance":"1.00"}
   */
  async getBalance() {
    return await this.req({ url: formbaseurl("request/balance") });
  }

  /**
   * @returns async {[Array of all orders]}
   */
  async getHistory() {
    return await this.req({ url: formbaseurl("request/history") });
  }

  /**
   * @returns async [ { timestamp: "2022-05-24 21:20:07", order_code: "ABCDEFGH", phonenumber: "123456789", code: "0", full_code: "0", short_name: "US", service: "Service", status: "pending", expiry: "1653420607", } ]
   */
  async getActiveOrders() {
    return await this.req({ url: formbaseurl("request/active") });
  }

  /**
   * on success
   * @returns async {"price":"0.75"}
   *
   * on fail condition 1
   * @returns async {"success":0,"message":"Fill in all params!"}
   *
   * on fail condition 2
   * @returns async {"success":0,"message":"No price was found for this query.","price":0}
   */
  async getPrice({ country, service } = {}) {
    country = country || this.country;
    service = service || this.service;

    if (country) {
      await this.fetchcountries;
      if (!this.countrys.has(country)) {
        print("Invalid country");
        return;
      }
    }

    if (service) {
      await this.fetchservices;
      if (!this.services.has(service)) {
        print("Invalid service");
        return;
      }
    }
    return await this.req({
      url: formbaseurl("request/price"),
      params: {
        country,
        service,
      },
    });
  }

  /**
   * on success
   * @returns async {"success":1,"number":"123456789","order_id":"ABCDEFG","country":"United States","service":"Service","pool":5,"expires_in":599,"message":""}
   *
   * on fail condition 1
   * @returns async {"success":0,"message":"This country is currently not available for this service, please try the following countries: "}
   *
   * on fail condition 2
   * @returns async {"success":0,"message":"Insufficient balance, the price is: 0.85 while you only have: 0.00"}
   *
   * on fail condition 3
   * @returns async {"success":0,"errors":[{"message":"Missing or invalid param: country"},{"message":"Missing or invalid param: service"},{"message":"Missing or invalid param: key","description":"Your API key which can be found on your settings page at /my/settings"}]}
   *
   * on fail condition 4
   * @returns async {"success":0,"message":"This service is not available for this country."}
   *
   * on fail condition 5
   * @returns async {"success":0,"message":"Something went horribly wrong, try again please!"}
   */
  async orderSMS({
    country,
    service,
    pool,
    max_price,
    pricing_option,
    area_code,
  }) {
    country = country || this.country;
    service = service || this.service;
    pool = pool || this.pool;
    max_price = max_price || this.max_price;
    if (!country || !service) {
      print("Missing service or country");
      return;
    }

    await this.fetchservices;
    if (!this.services.has(service)) {
      print("Invalid service");
      return;
    }

    await this.fetchcountries;
    if (!this.countries.has(country)) {
      print("Invalid country");
      return;
    }

    return await this.req({
      url: formbaseurl("purchase/sms"),
      params: {
        country,
        service,
        pool,
        max_price,
        pricing_option,
        area_code,
      },
    });
  }

  /**
   * @param {string} orderid - Order of the id
   *
   * on success condition 1
   * @returns async {"status":1,"message":"pending","resend":0,"expiration":1669382268}
   *
   * on success condition 2
   * @returns async {"status":2,"message":"expired","resend":0,"expiration":1669382268}
   *
   * on success condition 3
   * @returns async {"status":3,"sms":"00000","full_sms":"full SMS","expiration":1669382268}
   *
   * on success condition 4
   * @returns async {"status":4,"message":"resend","resend":0,"expiration":1669382268}
   *
   * on success condition 5
   * @returns async {"status":5,"message":"cancelled","resend":0,"expiration":1669382268}
   *
   * on success condition 6
   * @returns async {"status":6,"message":"refunded","resend":0,"expiration":1669382268}
   *
   * on fail condition 1
   * @returns async {"success":0,"message":"We could not find this order!"}
   */
  async checkSMS(orderid, { poll, timeout, cancel } = {}) {
    if (poll) {
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
              case 1:
                break;
              case 2:
                exit = true;
                break;
              case 3:
                code = v?.sms;
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
    } else {
      return await this.req({
        url: formbaseurl("sms/check"),
        params: { orderid },
      });
    }
  }

  /**
   * @param {any} orderid - Id of the order
   *
   * on success
   * @returns async {"success":1,"message":"Number has been requested again","resend":0}
   *
   * on failure
   * @returns async {"success":0,"message":"Phonenumber could not be requested again, try later again.","resend":0}
   */
  async resendSMS(orderid) {
    return await this.req({
      url: formbaseurl("sms/resend"),
      params: { orderid },
    });
  }

  /**
   * @param {any} orderid - Id of the order
   *
   * on success
   * @returns async {"success":1}
   *
   * on failure
   * @returns async {"success":0}
   */
  async cancelSMS(orderid) {
    return await this.req({
      url: formbaseurl("sms/cancel"),
      params: { orderid },
    });
  }

  /**
   * on success
   * @returns async {"success":1,"message":"All your inactive orders have been archived."}
   */
  async archiveAllInactiveOrders() {
    return await this.req({
      url: formbaseurl("request/archive"),
    });
  }

  async getRentals(type) {
    if (!type) {
      print("Missing Rental type");
      return;
    }
    return await this.req({
      url: formbaseurl("rental/retrieve_all"),
      params: {
        type,
      },
    });
  }

  async orderRental({ id, days, service_id }) {
    if (!id || !days || !service_id) {
      print("Missing some params");
      return;
    }

    return await this.req({
      url: formbaseurl("purchase/rental"),
      params: { id, days, service_id },
    });
  }

  async getRentalMessage(rental_code) {
    if (!rental_code) {
      print("Missing rental_code");
      return;
    }

    return await this.req({
      url: formbaseurl("rental/retrieve_messages"),
      params: { rental_code },
    });
  }

  async getRentalStatus(rental_code) {
    if (!rental_code) {
      print("Missing rental_code");
      return;
    }

    return await this.req({
      url: formbaseurl("rental/retrieve_status.php"),
      params: { rental_code },
    });
  }

  async extendRental({ days, rental_code }) {
    if (!rental_code || !days) {
      print("Missing rental_code or days");
      return;
    }

    return await this.req({
      url: formbaseurl("rental/extend.php"),
      params: { rental_code, days },
    });
  }
}

export default SMSPoolClient;
