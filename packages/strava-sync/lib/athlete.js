/**
 * @param {object} options
 * @param {import("./client.js").Client} options.client
 * @param {{withKoms?: boolean, withStats?: boolean, withZones?: boolean}} [options.details]
 */
export const fetchAthlete = async ({
  client,
  details: {withKoms = false, withStats = false, withZones = false} = {},
}) => {
  const athlete = await client.get("athlete")

  return {
    ...athlete,
    ...(withKoms && {koms: await client.get(`athletes/${athlete.id}/koms`)}),
    ...(withStats && {stats: await client.get(`athletes/${athlete.id}/stats`)}),
    ...(withZones && {zones: await client.get("athlete/zones")}),
  }
}
