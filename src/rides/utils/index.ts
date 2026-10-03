import * as moment from "moment";

export default function getCurrentUTCFormatted() {
  const now = new Date();

  // Get individual components
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0"); // Months are zero-based
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  const milliseconds = String(now.getUTCMilliseconds()).padStart(3, "0");

  // Create formatted string
  const formattedNow = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;

  return formattedNow;
}

export function GetRelativeTime(createdAt: Date): string {
  // Convert the createdAt timestamp to a moment object
  const createdAtMoment = moment(createdAt);
  // Calculate the difference between now and createdAt
  const now = moment();
  const duration = moment.duration(now.diff(createdAtMoment));

  // Format the duration as relative time
  return duration.humanize();
}

export function HaversineDistance(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return 0; // Return 0 or another default value if any coordinate is missing
  }

  const toRadians = (degree: number) => degree * (Math.PI / 180);
  const R = 3958.8; // Radius of Earth in miles

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
