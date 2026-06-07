import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { AdminSessionConfig } from "./admin-session";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keyLength: number
) => Promise<Buffer>;

const CREDENTIALS_VERSION = 1 as const;
const HASH_KEY_LENGTH = 64;
const PASSWORD_MIN_LENGTH = 10;

interface StoredAdminCredentials {
  algorithm: "scrypt";
  keyLength: number;
  passwordHash: string;
  salt: string;
  updatedAt: string;
  version: 1;
}

interface EnvAdminCredentials {
  password: string;
  source: "env";
  username: string;
}

interface FileAdminCredentials {
  passwordHash: string;
  source: "file";
  stored: StoredAdminCredentials;
  username: string;
}

export type ActiveAdminCredentials = EnvAdminCredentials | FileAdminCredentials;

export type AdminPasswordValidationError = "complexity" | "length";

type StoredCredentialReadResult =
  | { credentials: StoredAdminCredentials; status: "valid" }
  | { status: "missing" }
  | { status: "invalid" };

export const getAdminCredentialStorePath = (): string => {
  const configuredPath = process.env.PROCHARTS_ADMIN_CREDENTIALS_FILE?.trim();
  if (configuredPath) {
    return configuredPath;
  }

  return path.join(process.env.HOME || process.cwd(), ".procharts", "admin-credentials.json");
};

const getEnvAdminUsername = (): string | null => process.env.PROCHARTS_ADMIN_USERNAME?.trim() || null;

const getEnvAdminPassword = (): string | null => process.env.PROCHARTS_ADMIN_PASSWORD?.trim() || null;

const isStoredAdminCredentials = (value: unknown): value is StoredAdminCredentials => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<StoredAdminCredentials>;
  return (
    record.version === CREDENTIALS_VERSION &&
    record.algorithm === "scrypt" &&
    record.keyLength === HASH_KEY_LENGTH &&
    typeof record.salt === "string" &&
    record.salt.length > 0 &&
    typeof record.passwordHash === "string" &&
    record.passwordHash.length > 0 &&
    typeof record.updatedAt === "string" &&
    record.updatedAt.length > 0
  );
};

const readStoredAdminCredentials = async (): Promise<StoredCredentialReadResult> => {
  try {
    const raw = await fs.readFile(getAdminCredentialStorePath(), "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (!isStoredAdminCredentials(parsed)) {
      return { status: "invalid" };
    }

    return { credentials: parsed, status: "valid" };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { status: "missing" };
    }

    return { status: "invalid" };
  }
};

const constantTimeStringEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const hashAdminPassword = async (password: string, salt = randomBytes(16).toString("base64url")) => {
  const passwordHash = (await scryptAsync(password, salt, HASH_KEY_LENGTH)).toString("base64url");

  return {
    algorithm: "scrypt" as const,
    keyLength: HASH_KEY_LENGTH,
    passwordHash,
    salt,
    updatedAt: new Date().toISOString(),
    version: CREDENTIALS_VERSION,
  };
};

export const getActiveAdminCredentials = async (): Promise<ActiveAdminCredentials | null> => {
  const username = getEnvAdminUsername();
  if (!username) {
    return null;
  }

  const stored = await readStoredAdminCredentials();
  if (stored.status === "valid") {
    return {
      passwordHash: stored.credentials.passwordHash,
      source: "file",
      stored: stored.credentials,
      username,
    };
  }

  if (stored.status === "invalid") {
    return null;
  }

  const password = getEnvAdminPassword();
  if (!password) {
    return null;
  }

  return {
    password,
    source: "env",
    username,
  };
};

export const getAdminSessionConfigFromCredentials = (
  credentials: ActiveAdminCredentials
): AdminSessionConfig => ({
  sessionSecret:
    credentials.source === "file"
      ? credentials.passwordHash
      : process.env.PROCHARTS_ADMIN_SESSION_SECRET?.trim() || credentials.password,
  username: credentials.username,
});

export const verifyAdminPassword = async (
  password: string,
  credentials: ActiveAdminCredentials
): Promise<boolean> => {
  if (credentials.source === "env") {
    return constantTimeStringEqual(password, credentials.password);
  }

  const passwordHash = (await scryptAsync(password, credentials.stored.salt, credentials.stored.keyLength)).toString(
    "base64url"
  );

  return constantTimeStringEqual(passwordHash, credentials.stored.passwordHash);
};

export const validateNewAdminPassword = (password: string): AdminPasswordValidationError | null => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "length";
  }

  if (!/[A-Za-z]/u.test(password) || !/[0-9]/u.test(password) || !/[^A-Za-z0-9]/u.test(password)) {
    return "complexity";
  }

  return null;
};

export const writeAdminPassword = async (password: string): Promise<ActiveAdminCredentials> => {
  const username = getEnvAdminUsername();
  if (!username) {
    throw new Error("Admin username is not configured.");
  }

  const credentials = await hashAdminPassword(password);
  const filePath = getAdminCredentialStorePath();
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(directory, `.admin-credentials-${process.pid}-${Date.now()}.json`);

  await fs.mkdir(directory, { mode: 0o700, recursive: true });
  await fs.writeFile(temporaryPath, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporaryPath, filePath);
  await fs.chmod(filePath, 0o600);

  return {
    passwordHash: credentials.passwordHash,
    source: "file",
    stored: credentials,
    username,
  };
};
