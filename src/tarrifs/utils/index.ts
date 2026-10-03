export function getMinutesIntoHrs(minutes: number) {
  if (minutes < 60) {
    return `${Math.floor(minutes)}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${remainingMinutes}min`;
  }
}
