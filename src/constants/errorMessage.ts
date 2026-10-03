const ERROR_MESSAGE = {
  USER_NOT_FOUND: "User not found",
  RIDE_NOT_FOUND: "Ride not found",
  INCORRECT_PASSWORD: "Incorrect Password",
  CONFLLICT: "User already exists with this email/phone number",
  BADGE_EXPIRED: "Badge expired. Please contact the office.",
  INSURANCE_EXPIRED: "Insurance expired. Please contact the office.",
  MOT_EXPIRED: "MOT expired. Please contact the office.",
  PLATE_EXPIRED: "Plate expired. Please contact the office.",
  ROAD_TAX_EXPIRED: "Road tax expired. Please contact the office.",
  LISCENSE_EXPIRED: "Licence expired. Please contact the office.",
  USER_SUSPENDED: "Your account has been suspended. Please contact office",
  USER_DISABLED: "Your account has been deactivated. Please contact office",
  EMAIL_ALREADY_EXISTS: "User with this email already exists",
  CAPABILITY_NAME_ALREADY_EXISTS: "Capability with this name already exists",
  CAPABILITY_SHORT_CODE_ALREADY_EXISTS:
    "Capability with this short code already exists",
  NOT_FOUND: "NOT FOUND",
  AREA_GROUP_DUPLICATE: "Charging Zone with this name already exists",
  ZONE_TEMPLATE_DUPLICATE: "Zone template with this name already exists",
  CAPABILITY_CHARGE_TEMPLATE_DUPLICATE:
    "Capability charge template with this name already exists",
  VARIABLE_TEMPLATE_DUPLICATE:
    "Variable fare template with this name already exists",
  TARIFF_DUPLICATE:
    "Tariff already exist. Please add unique tariff name and short name.",
  CAPABILITY_TEMPLATE_DUPLICATE:
    "Capability charges template with this name already exists",
  VEHICLE_ASSOCIATED_WITH_LISCENSE:
    "This vehicle is already associated with a licence.",
  CAPABILITY_ASSOCIATED_WITH_DRIVER:
    "This capability is already associated with one or multiple drivers",
  CAPABILITY_ASSOCIATED_WITH_VEHICLE:
    "This capability is already associated with one or multiple vehicles",
  CAPABILITY_ASSOCIATED_WITH_TEMPLATE:
    "This capability is already associated with one or multiple templates",
  AREA_GROUP_NOT_FOUND:
    "The area group you are looking for is not found in our system",
  DRIVER_ALREADY_ASSIGNED: "Driver is already assigned to a vehicle",
  DRIVER_ALREADY_ASSOCITED_LICENSE:
    "Driver is already associated with a licence",
  DRIVER_CALLSIGN:
    " This driver call sign id already exists. Please enter a unique id",
  VEHICLE_CALLSIGN:
    " This vehicle call sign id already exists. Please enter a unique id",
  VEHICLE_REGISTRATION_ALREADY_EXISTS:
    " This vehicle registration number already exists. Please enter a unique registration number",
  LISCENSE_NOT_FOUND: "Licence not found",
  LICENSE_DRIVER_RIDES_EXISTS:
    "The license cannot be deleted as rides exist for this driver.",
  VEHICLE_NOT_FOUND: "Vehicle does not exist",
  VEHICLE_ASSOCIATED: "Vehicle is already associated with a licence",
  VEHICLE_ASSOCIATED_DRIVER: "Vehicle is already associated with a driver",
  FIREBASE_TOKEN_EXPIRED: "Firebase token has expired",
  DRIVER_GROUP_NAME_ALREADY_EXISTS: "Driver group name already exists",
  DRIVER_NOT_FOUND: "Driver not found",
  SET_LOCATION_FAILED: "Cannot update location",
  DONOT_OPERATE_AREA_ERROR: "Sorry, we do not operate in this region",
  DRIVER_GROUP_MODE_IS_NOTALLOWED: "Access not allowed, please contact office",
  DRIVER_ALREADY_IN_DRIVER_GROUP:
    "Driver is in another group. Remove them from the current group before adding to a new one.",
  RATING_NOT_FOUND: "Rating not found",
  BOOKING_NOT_FOUND: "Booking not found",
  DRIVER_SUSPENDED: "Driver Suspended",
  DRIVER_DEACTIVATED: "Driver Deactivated",
  DRIVER_NOT_ASSIGNED: "Driver is not assigned to this ride.",
  RIDE_NOT_DISPATCHED: "Ride is currently not being offered.",
  CAPABILITY_DISABLED: "The selected capability is disabled.",
  RIDE_HAS_BEEN_CANCELLED: "Oppss!, the ride has been cancelled.",
  NO_VEHICLE_WITH_CALLSIGN: "No Vehicle found with this callsign.",
};

export { ERROR_MESSAGE };
