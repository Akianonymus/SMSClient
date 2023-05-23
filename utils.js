import axios from "axios";
import { axios_config } from "./constants.js";
import readline from "readline";

let axi = axios.create(axios_config);

export async function request(config, retryCount = 0, timetowait = 1000) {
  try {
    const a = await axi.request(config);
    return a;
  } catch (e) {
    if (e?.code > 500 || retryCount <= 0) {
      return e;
    }

    await wait(timetowait);
    return await request(config, retryCount - 1, timetowait);
  }
}

export function print(
  text = "",
  no_newline = false,
  fill = " ",
  align = "left"
) {
  const end = no_newline ? `\r` : `\n`;
  text = no_newline && text[0] !== " " ? " " + text : text;
  let cols = process.stdout.columns;
  if (typeof text !== "string") {
    text = JSON.stringify(text, null, 2);
  }

  if (cols < text?.length) {
    process.stdout.write(`${text}${end}`);
    return;
  }

  switch (align) {
    case "right":
      process.stdout.write(
        `${fill.repeat(cols - text?.length || 0)}${text}${end}`
      );
      break;
    case "left":
      process.stdout.write(
        `${text}${fill.repeat(cols - text?.length || 0)}${end}`
      );
      break;
    default:
      cols -= text.length;
      process.stdout.write(
        `${fill.repeat(Math.abs(cols / 2))}${text}${fill.repeat(
          Math.abs(cols / 2)
        )}${end}`
      );
      break;
  }
}

export function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function random(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export const wait = async (duration) => {
  return await new Promise((r) => setTimeout(r, duration));
};

export function waitForEnter(text) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(text, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

export async function retry(fn, retryCount = 3, timetowait = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retryCount <= 0) {
      throw error;
    }
    await wait(timetowait);
    return await retry(fn, retryCount - 1);
  }
}
