import { supabase } from "@/integrations/supabase/client";

export async function confirmSignupWithCode(email: string, code: string) {
  const token = code.trim().replace(/\s+/g, "");
  const normalized = email.trim().toLowerCase();
  if (!normalized || !token) {
    return { error: new Error("Enter the email and the code from the message.") };
  }
  const { error } = await supabase.auth.verifyOtp({
    email: normalized,
    token,
    type: "signup",
  });
  return { error: error as Error | null };
}
