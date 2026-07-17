/**
 * City scale calibration (world units ≈ meters).
 *
 * Pilot (~1.78 m) and hang-glider span (~10.2 m) stay real-world.
 * Kenney cars read small on 11 m lanes, so we bump vehicles.
 * Buildings get a light height bias so mid-rises feel less toy-like.
 */
export const CITY_VEHICLE_SCALE = 1.38
export const CITY_BUILDING_HEIGHT_BIAS = 1.1
