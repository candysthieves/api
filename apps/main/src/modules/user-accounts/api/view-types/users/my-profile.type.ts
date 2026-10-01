import { GetCountryViewType } from '../locations/get-country-view.type.js';
import { GetCityViewType } from '../locations/get-city.view.type.js';

export type MyProfileType = {
  username: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  country: GetCountryViewType | null;
  city: GetCityViewType | null;
  aboutMe: string | null;
};
