import Legal from "../../components/Legal";
export const metadata = { title: "Terms of Service" };

// Draft text: review and adapt before launch.
export default function Terms() {
  return (
    <Legal title="Terms of Service" updated="October 2026" sections={[
      ["Using Fades Chat", "You must provide accurate account information and keep your password secure. You're responsible for activity on your account."],
      ["Acceptable use", "Don't use Fades Chat to harass others, send spam, share illegal content or try to break the service."],
      ["Your content", "You own the messages you send. You allow us to store and deliver them so the service works."],
      ["Availability", "We work to keep Fades Chat running but can't guarantee it will always be available or error-free."],
      ["Changes", "We may update these terms. Continuing to use the service means you accept the updated terms."],
    ]} />
  );
}
