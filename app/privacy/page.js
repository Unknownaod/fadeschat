import Legal from "../../components/Legal";
export const metadata = { title: "Privacy Policy" };

// Draft text: review and adapt before launch.
export default function Privacy() {
  return (
    <Legal title="Privacy Policy" updated="October 2026" sections={[
      ["What we collect", "Your account details (username, display name, email) and the messages you send and receive in Fades Chat."],
      ["How we use it", "To run the service: signing you in, delivering messages and showing read receipts. We don't sell your personal information."],
      ["Cookies", "We use a session cookie to keep you signed in. It is required for the service to work."],
      ["Your choices", "You can edit or delete your messages at any time. To delete your account or data, contact us."],
      ["Contact", "Questions about privacy? Reach us through fades.lol."],
    ]} />
  );
}
