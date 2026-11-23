import { corsPreflight, jsonResponse } from "../_shared/authenticatedUser.ts";

/** Instant self-delete is retired. Clients must use account-deletion (30-day request). */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();
  return jsonResponse(
    {
      error:
        "Account deletion is a 30-day request reviewed by the Arxon team. Open Profile → Delete account.",
      code: "use_request_flow",
    },
    410,
  );
});
