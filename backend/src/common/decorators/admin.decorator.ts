import { SetMetadata } from '@nestjs/common';

export const IS_ADMIN_KEY = 'adminRole';

export const AdminOnly = () => SetMetadata(IS_ADMIN_KEY, 'admin');
export const StaffOrAdmin = () => SetMetadata(IS_ADMIN_KEY, 'any');
export const StaffOnly = () => SetMetadata(IS_ADMIN_KEY, 'staff');
