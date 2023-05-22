import { request, print } from "./utils.js";

export class SMSPoolClient {
  constructor({ key, defaults: { country, service, pool, max_price } = {} }) {
    if (!key) {
      throw Error("Key Not Provided");
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

  async getCountries() {
    return await this.req({
      url: "https://api.smspool.net/country/retrieve_all",
    });
  }

  async getServices() {
    return await this.req({
      url: "https://api.smspool.net/service/retrieve_all",
    });
  }

  async getBalance() {
    return await this.req({ url: "https://api.smspool.net/request/balance" });
  }

  async getHistory() {
    return await this.req({ url: "https://api.smspool.net/request/history" });
  }

  async getActiveOrders() {
    return await this.req({ url: "https://api.smspool.net/request/active" });
  }

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
      url: "https://api.smspool.net/request/active",
      params: {
        country,
        service,
      },
    });
  }

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
      url: "https://api.smspool.net/purchase/sms",
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

  async checkSMS(orderid) {
    return await this.req({
      url: "https://api.smspool.net/sms/check",
      params: { orderid },
    });
  }

  async resendSMS(orderid) {
    return await this.req({
      url: "https://api.smspool.net/sms/resend",
      params: { orderid },
    });
  }

  async cancelSMS(orderid) {
    return await this.req({
      url: "https://api.smspool.net/sms/cancel",
      params: { orderid },
    });
  }

  async archiveAllInactiveOrders() {
    return await this.req({
      url: "https://www.api.smspool.net/request/archive",
    });
  }

  async getRentals(type) {
    if (!type) {
      print("Missing Rental type");
      return;
    }
    return await this.req({
      url: "https://www.api.smspool.net/rental/retrieve_all",
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
      url: "https://api.smspool.net/purchase/rental",
      params: { id, days, service_id },
    });
  }

  async getRentalMessage(rental_code) {
    if (!rental_code) {
      print("Missing rental_code");
      return;
    }

    return await this.req({
      url: "https://api.smspool.net/rental/retrieve_messages",
      params: { rental_code },
    });
  }

  async getRentalStatus(rental_code) {
    if (!rental_code) {
      print("Missing rental_code");
      return;
    }

    return await this.req({
      url: "https://api.smspool.net/rental/retrieve_status.php",
      params: { rental_code },
    });
  }

  async extendRental({ days, rental_code }) {
    if (!rental_code || !days) {
      print("Missing rental_code or days");
      return;
    }

    return await this.req({
      url: "https://api.smspool.net/rental/extend.php",
      params: { rental_code, days },
    });
  }
}

export default SMSPoolClient;
