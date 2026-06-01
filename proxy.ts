import { auth } from "@/auth";

// Simple proxy for Auth.js.
// Currently soft protection (no hard login wall) to match product design.
export default auth(() => {
  // Protected route logic can be added here later.
  // Example:
  // if (!req.auth && req.nextUrl.pathname.startsWith("/protected")) {
  //   return Response.redirect(new URL("/login", req.nextUrl));
  // }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
