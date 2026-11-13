import api from "./api";


export const changeAdminPassword = async ({
  newPassword,
  confirmPassword,
}) => {
  const { data } = await api.put(
    "/api/admin/settings/change-password",
    {
      newPassword,
      confirmPassword,
    }
  );

  return data;
};