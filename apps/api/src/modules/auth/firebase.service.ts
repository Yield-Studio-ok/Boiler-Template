import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as admin from "firebase-admin";
import { existsSync, readFileSync } from "fs";
import type { AuthUser } from "./auth.types";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App | null = null;

  onModuleInit() {
    if (admin.apps.length > 0) {
      this.firebaseApp = admin.app();
      return;
    }

    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      if (!existsSync(credPath)) {
        this.failOrWarn(`Firebase credentials file not found at ${credPath}`);
        return;
      }

      try {
        const serviceAccount = JSON.parse(readFileSync(credPath, "utf8"));
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log("Firebase Admin initialized");
        return;
      } catch (error) {
        this.failOrWarn(
          `Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : error}`,
        );
        return;
      }
    }

    this.failOrWarn("GOOGLE_APPLICATION_CREDENTIALS is not set");
  }

  isEnabled() {
    return this.firebaseApp !== null;
  }

  async verifyIdToken(token: string): Promise<AuthUser> {
    if (!this.firebaseApp) {
      throw new Error("Firebase is not configured");
    }

    const decoded = await this.firebaseApp.auth().verifyIdToken(token);
    const customRole = (decoded as { role?: unknown }).role;

    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      role: typeof customRole === "string" ? customRole : "user",
    };
  }

  private failOrWarn(message: string) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`${message}. Production cannot fall back to demo auth.`);
    }

    this.logger.warn(`${message} — demo JWT auth enabled`);
  }
}
