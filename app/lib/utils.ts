import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as openpgp from "openpgp";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function encryptMessage(passedPublicKey: string, message: string) {
  const publicKey = await openpgp.readKey({ armoredKey: passedPublicKey });

  return openpgp.encrypt({
    message: await openpgp.createMessage({ text: message }), // input as Message object
    encryptionKeys: publicKey,
  });
}

export async function decryptMessage(
  passedPrivateKey: string,
  encrypted: string
) {
  if (!encrypted.includes("BEGIN")) {
    // not a pgp message
    return encrypted;
  }

  const message = await openpgp.readMessage({
    armoredMessage: encrypted, // parse armored message
  });
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: passedPrivateKey }),
    passphrase: "super long and hard to guess secret", // TODO
  });
  const { data: decrypted } = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey,
  });

  return decrypted;
}

export async function getUserIdFromPublicKey(armoredPublicKey: string) {
  try {
    const publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey });
    const userIds = publicKey.getUserIDs();
    return userIds;
  } catch (error) {
    console.error("Error reading public key:", error);
    return null;
  }
}

export async function getPGPKeys(name: string, email: string) {
  return openpgp.generateKey({
    type: "rsa", // Type of the key
    rsaBits: 4096, // RSA key size (defaults to 4096 bits)
    userIDs: [{ name, email }], // you can pass multiple user IDs
    passphrase: "super long and hard to guess secret", // protects the private key TODO
  });
}
