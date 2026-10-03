import { HttpStatus, Injectable, Res } from "@nestjs/common";
import axios from "axios";
import { PinoLogger } from "nestjs-pino";
import * as jwt from "jsonwebtoken";
// import {format} from "date-fns";
@Injectable()
export class UtilsService {
  constructor(private readonly logger: PinoLogger) {
    logger.setContext(UtilsService.name);
  }
  async convertNumericToString(obj) {
    for (const key in obj) {
      if (typeof obj[key] === "number") {
        obj[key] = obj[key].toString();
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        await this.convertNumericToString(obj[key]);
      }
    }
    return obj;
  }

  async decodeToken(authorizationHeader) {
    const token = authorizationHeader.split(" ")[1]; // Assuming "Bearer <token>"
    // Verify and decode the JWT token
    const decoded: any = jwt.decode(token);
    return decoded;
  }

  async denyAccess(@Res() res): Promise<void> {
    this.logger.info("Service=>denyAccess=>Request");
    res.status(HttpStatus.FORBIDDEN).json("You shall not pass!");
  }
  // async formatDate(obj): Promise<void> {
  //   if(!Array.isArray(obj)){
  //     if(obj.created!= undefined){
  //       obj.created = format(obj.created, 'yyyy-MM-dd HH:mm:ss');
  //     }
  //     if(obj.lastModified!= undefined){
  //       obj.lastModified = format(obj.lastModified, 'yyyy-MM-dd HH:mm:ss');
  //     }
  //     if(obj.deleted_at!= undefined){
  //       obj.deleted_at = format(obj.deleted_at, 'yyyy-MM-dd HH:mm:ss');
  //     }
  //   } else {
  //     for (let i=0; i<obj.length; i++){
  //       if(obj[i].created!= undefined){
  //         obj[i].created = format(obj[i].created, 'yyyy-MM-dd HH:mm:ss');
  //       }
  //       if(obj[i].lastModified!= undefined){
  //         obj[i].lastModified = format(obj[i].lastModified, 'yyyy-MM-dd HH:mm:ss');
  //       }
  //       if(obj[i].deleted_at!= undefined){
  //         obj[i].deleted_at = format(obj[i].deleted_at, 'yyyy-MM-dd HH:mm:ss');
  //       }
  //     }
  //   }
  //   return obj;
  // }

  async handleDbError(e) {
    this.logger.error("Utils=>handleDB=>Error: %o", e);

    // Handle different types of database errors
    if (e.name === "QueryFailedError") {
      // Handle query errors (e.g., column not found, constraint violation, etc.)
      return {
        status: HttpStatus.BAD_REQUEST,
        message: "Internal server error.",
      };
    } else if (e.name === "EntityNotFoundError") {
      // Handle entity not found errors (e.g., when trying to update or delete a non-existent record)
      return { status: HttpStatus.NOT_FOUND, message: "Not found." };
    } else if (e.name === "ForeignKeyConstraintError") {
      // Handle foreign key constraint errors
      return { status: 400, message: "Foreign key constraint violation." };
    } else if (e.name === "UniqueConstraintError") {
      // Handle unique constraint errors
      return { status: 400, message: "Unique constraint violation." };
    } else {
      // Handle other unknown errors
      return {
        status: 500,
        message: "An unexpected error occurred during database operation.",
      };
    }
  }
  async convertBooleanPropertiesToInteger(data: any): Promise<any> {
    if (Array.isArray(data)) {
      return data.map((item) => {
        return Object.fromEntries(
          Object.entries(item).map(([key, value]) => {
            return [key, typeof value === "boolean" ? (value ? 1 : 0) : value];
          })
        );
      });
    } else {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => {
          return [key, typeof value === "boolean" ? (value ? 1 : 0) : value];
        })
      );
    }
  }
  async generateRandomString(length) {
    const uppercaseCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercaseCharset = "abcdefghijklmnopqrstuvwxyz";
    const specialCharset = "!@#$%^&*()_-+=<>?/[]{},.:;";
    const charset = uppercaseCharset + lowercaseCharset + specialCharset;

    let randomString = "";

    // Ensure at least one uppercase letter
    randomString +=
      uppercaseCharset[Math.floor(Math.random() * uppercaseCharset.length)];

    // Ensure at least one lowercase letter
    randomString +=
      lowercaseCharset[Math.floor(Math.random() * lowercaseCharset.length)];

    // Ensure at least one special character
    randomString +=
      specialCharset[Math.floor(Math.random() * specialCharset.length)];

    // Fill the remaining characters
    for (let i = randomString.length; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      randomString += charset[randomIndex];
    }

    // Shuffle the string to randomize the positions of the required characters
    randomString = randomString
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    return randomString;
  }

  async UtcDate(date) {
    const utcString = date.toUTCString();
    return utcString;
  }
  generatePassword() {
    var length = 8,
      charset = process.env.CHAR_SET,
      retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }
  isWithinLast14Days() {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    return fourteenDaysAgo;
  }
  isWithinLast30Days() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return thirtyDaysAgo;
  }
  checkExpireyDate(date: Date): boolean {
    const expiryDate = new Date(date);
    const currentDate = new Date();

    // Check if currentDate is greater than or equal to expiryDate
    if (currentDate.getTime() >= expiryDate.getTime()) {
      return true; // Expired
    }

    return false; // Not expired
  }

  capitalizeWords(str) {
    // Split the string into words
    let words = str.split(" ");

    // Capitalize each word
    for (let i = 0; i < words.length; i++) {
      words[i] =
        words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
    }

    // Join the words back into a string and return
    return words.join(" ");
  }

  extractTime(timestamp: string): string {
    // Create a Date object from the timestamp string
    const date = new Date(timestamp);

    // Extract hours, minutes, seconds, and milliseconds
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    // Format the time as HH:mm:ss.SSS
    return `${hours}:${minutes}:${seconds}`;
  }
  timeDifference(date1: Date, date2: Date): string {
    // Function to format milliseconds into HH:mm:ss.SSS
    function formatTime(milliseconds: number): string {
      const hours = Math.floor(milliseconds / 3600000)
        .toString()
        .padStart(2, "0");
      const minutes = Math.floor((milliseconds % 3600000) / 60000)
        .toString()
        .padStart(2, "0");
      const seconds = Math.floor((milliseconds % 60000) / 1000)
        .toString()
        .padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    }

    // Convert dates to milliseconds since start of the day
    function getTimeInMillis(date: Date): number {
      return (
        date?.getHours() * 3600000 +
        date?.getMinutes() * 60000 +
        date?.getSeconds() * 1000 +
        date?.getMilliseconds()
      );
    }

    // Get milliseconds for both dates
    const time1Ms = getTimeInMillis(date1);
    const time2Ms = getTimeInMillis(date2);

    // Calculate the difference
    const diffMs = Math.abs(time2Ms - time1Ms);
    // Format the difference into HH:mm:ss.SSS
    return formatTime(diffMs);
  }
  convertKmToMiles(km: string): number {
    const match = km.match(/([\d.]+)/);
    const kilometers = match ? parseFloat(match[1]) : 0; // Convert to number
    return kilometers * 0.621371; // Convert kilometers to miles
  }

  async getDistanceAndTimeInBulk(locations) {
    if (locations.length < 2) {
      throw new Error("At least two locations are required.");
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    let totalDistanceKm = 0;
    let totalDistanceMiles = 0;
    let totalDuration = 0;

    for (let i = 0; i < locations.length - 1; i++) {
      const origin = `${locations[i].lattitude},${locations[i].longitude}`;
      const destination = `${locations[i + 1].lattitude},${
        locations[i + 1].longitude
      }`;
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${origin}&destinations=${destination}&key=${apiKey}`;

      try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.status === "OK") {
          const distanceKm = data.rows[0].elements[0].distance.value / 1000; // Distance in kilometers
          const durationSec = data.rows[0].elements[0].duration.value; // Duration in seconds

          // Convert kilometers to miles
          const distanceMiles = distanceKm * 0.621371;

          totalDistanceKm += distanceKm;
          totalDistanceMiles += distanceMiles;
          totalDuration += durationSec;
        } else {
          throw new Error(`Google Maps API error: ${data.status}`);
        }
      } catch (error) {
        console.error(
          "Error fetching data from Google Maps API:",
          error.message
        );
        throw error;
      }
    }

    // Convert total duration from seconds to a more readable format
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const seconds = totalDuration % 60;

    return {
      totalDistanceKm,
      totalDistanceMiles,
      totalDuration: `${hours}h ${minutes}m ${seconds}s`,
    };
  }
}
