/** The invite-accept landing must be reachable while unauthenticated. */
function isPublicAcceptPath(pathname: string): boolean {
  return (
    pathname === "/couple/accept" || pathname.startsWith("/couple/accept/")
  );
}

export function isProtectedPath(pathname: string): boolean {
  if (isPublicAcceptPath(pathname)) return false;
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/couple" ||
    pathname.startsWith("/couple/") ||
    pathname === "/home" ||
    pathname.startsWith("/home/") ||
    pathname === "/articles" ||
    pathname.startsWith("/articles/") ||
    pathname === "/me" ||
    pathname.startsWith("/me/")
  );
}

export function isAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/")
  );
}
