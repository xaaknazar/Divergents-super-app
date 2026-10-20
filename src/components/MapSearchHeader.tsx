import React from 'react';
import { MapCityButton } from './MapCityButton';
import { ProfileAvatarButton, ProfileAvatarButtonProps } from './ProfileAvatarButton';
import { SearchField } from './SearchField';
import { Wrapper } from './Wrapper';

export interface MapSearchHeaderProps {
  city: string;
  country?: string;
  cityPickerOpen: boolean;
  onChooseCity: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchFocus?: () => void;
  onSearchBlur?: () => void;
  searchPlaceholder: string;
  profile: Omit<ProfileAvatarButtonProps, 'onPress' | 'variant'>;
  onOpenProfile: () => void;
}

/** Location gets its own row; search never competes with a long city name. */
export function MapSearchHeader(p: MapSearchHeaderProps) {
  return <Wrapper testID="map-search-header" gap={10}>
    <Wrapper testID="map-location-row" dir="row" gap={10} align="center">
      <Wrapper flex={1}>
        <MapCityButton city={p.city} country={p.country} expanded={p.cityPickerOpen} onPress={p.onChooseCity} />
      </Wrapper>
      <Wrapper shrink={0}>
        <ProfileAvatarButton {...p.profile} variant="floating" onPress={p.onOpenProfile} />
      </Wrapper>
    </Wrapper>
    <Wrapper testID="map-search-row">
      <SearchField surface="raised" value={p.searchValue} onChangeText={p.onSearchChange}
        onFocus={p.onSearchFocus} onBlur={p.onSearchBlur} placeholder={p.searchPlaceholder} />
    </Wrapper>
  </Wrapper>;
}
