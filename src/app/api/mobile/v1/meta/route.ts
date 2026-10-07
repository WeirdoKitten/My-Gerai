import { apiOk } from "@/lib/mobile-api/respond";

/** Info publik untuk aplikasi saat dibuka: versi API dan versi aplikasi minimum yang masih didukung. */
export async function GET() {
  return apiOk({
    apiVersion: 1,
    minAppVersion: process.env.MOBILE_MIN_APP_VERSION || "0.0.0",
  });
}
