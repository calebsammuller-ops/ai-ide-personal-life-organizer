'use client'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              Welcome to Life Organizer (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy
              and ensuring the security of your personal information. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our mobile application and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Account information (email address, name)</li>
              <li>Calendar events and schedules</li>
              <li>Habit tracking data</li>
              <li>Meal plans and food scan images</li>
              <li>Thoughts and notes you capture</li>
              <li>Personal preferences and settings</li>
              <li>Messages with our AI assistant</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Device information (type, operating system)</li>
              <li>Usage data and analytics</li>
              <li>Log data and error reports</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To provide and maintain our services</li>
              <li>To personalize your experience with AI-powered features</li>
              <li>To analyze food through our scanning feature</li>
              <li>To generate insights and recommendations</li>
              <li>To send notifications and reminders (with your consent)</li>
              <li>To improve our services and develop new features</li>
              <li>To communicate with you about updates and support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. AI Processing</h2>
            <p className="text-muted-foreground">
              Our application uses AI technology (powered by Anthropic&apos;s Claude) to provide personalized assistance.
              When you interact with our AI assistant or use features like food scanning:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Your messages and images are processed by our AI provider</li>
              <li>AI responses are generated based on your input and context</li>
              <li>We do not use your data to train AI models</li>
              <li>AI processing is subject to our provider&apos;s privacy practices</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Data Storage and Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Data is encrypted in transit and at rest</li>
              <li>We use secure authentication methods</li>
              <li>Access to data is restricted to authorized personnel</li>
              <li>We regularly monitor for security vulnerabilities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell your personal information. We may share your data with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Service providers who help us operate our services (Supabase, Anthropic, Stripe)</li>
              <li>Law enforcement when required by law</li>
              <li>Third parties with your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active. Upon account deletion:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Personal data is deleted within 30 days</li>
              <li>Anonymized analytics may be retained</li>
              <li>Backup data is purged within 90 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground">
              Our service is not intended for users under 13 years of age. We do not knowingly collect
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: privacy@lifeorganizer.app
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
