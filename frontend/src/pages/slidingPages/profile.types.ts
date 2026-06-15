export interface User {
  username?: string;
  firstName: string;
  lastName: string;
  email: string;
  city?: string;
  country?: string;
  dateOfBirth?: string; // ISO date string
  occupation?: string;
};
