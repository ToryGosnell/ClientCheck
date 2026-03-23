import { useCallback, useState } from "react";
import {
  getUserLocation,
  saveUserLocation,
  filterByLocation,
  rankByLocalRelevance,
  type LocationScope,
  type UserLocation,
} from "@/lib/location-scope";
import { track } from "@/lib/analytics";

export function useLocationScope() {
  const [loc, setLoc] = useState<UserLocation>(getUserLocation);

  const scope = loc.preferredSearchScope;
  const userState = loc.defaultState;
  const userCity = loc.defaultCity;

  const setScope = useCallback((newScope: LocationScope) => {
    const updated = saveUserLocation({ preferredSearchScope: newScope });
    setLoc(updated);
    track("location_scope_changed", { scope: newScope, state: updated.defaultState ?? undefined });
  }, []);

  const setDefaultState = useCallback((state: string) => {
    const updated = saveUserLocation({ defaultState: state });
    setLoc(updated);
  }, []);

  const setDefaultCity = useCallback((city: string) => {
    const updated = saveUserLocation({ defaultCity: city });
    setLoc(updated);
  }, []);

  const filter = useCallback(
    <T extends { city?: string | null; state?: string | null }>(items: T[]): T[] => {
      const filtered = filterByLocation(items, scope, userState, userCity);
      return rankByLocalRelevance(filtered, userState, userCity);
    },
    [scope, userState, userCity],
  );

  return {
    scope,
    userState,
    userCity,
    setScope,
    setDefaultState,
    setDefaultCity,
    filter,
    locationLabel:
      scope === "city" && userCity
        ? `${userCity}, ${userState ?? ""}`
        : scope === "state" && userState
          ? userState
          : "All States",
  };
}
