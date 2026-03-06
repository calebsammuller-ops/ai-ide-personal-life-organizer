'use client'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Life Organizer (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Life Organizer is a personal productivity application that provides:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Calendar and event management</li>
              <li>Habit tracking and analytics</li>
              <li>Meal planning and food scanning</li>
              <li>AI-powered personal assistant</li>
              <li>Daily planning and organization tools</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. User Accounts</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">3.1 Account Creation</h3>
            <p className="text-muted-foreground">
              You must provide accurate information when creating an account. You are responsible for
              maintaining the security of your account credentials.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">3.2 Account Responsibility</h3>
            <p className="text-muted-foreground">
              You are responsible for all activities that occur under your account. Notify us immediately
              of any unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Subscription and Payment</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">4.1 Free and Paid Plans</h3>
            <p className="text-muted-foreground">
              The Service offers both free and paid subscription plans. Paid features are subject to
              payment of applicable fees.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">4.2 Billing</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Subscriptions are billed in advance on a monthly or annual basis</li>
              <li>All payments are processed through Stripe</li>
              <li>Prices are subject to change with 30 days notice</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">4.3 Cancellation and Refunds</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You may cancel your subscription at any time</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>Refunds are provided at our discretion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the proper functioning of the Service</li>
              <li>Upload malicious content or malware</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Harass, abuse, or harm others through the Service</li>
              <li>Use the Service to generate harmful or inappropriate content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. AI Features</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">6.1 AI Assistance</h3>
            <p className="text-muted-foreground">
              The Service includes AI-powered features for productivity assistance. AI responses are
              generated automatically and should not be relied upon as professional advice.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">6.2 Food Scanning</h3>
            <p className="text-muted-foreground">
              Nutritional information from food scanning is estimated by AI and may not be accurate.
              Do not rely solely on this feature for dietary or medical decisions.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">6.3 Limitations</h3>
            <p className="text-muted-foreground">
              AI features are provided &quot;as is&quot; and may occasionally produce inaccurate or inappropriate
              responses. We continuously work to improve accuracy and safety.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Intellectual Property</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">7.1 Our Content</h3>
            <p className="text-muted-foreground">
              The Service and its original content, features, and functionality are owned by us and
              are protected by international copyright and other intellectual property laws.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">7.2 Your Content</h3>
            <p className="text-muted-foreground">
              You retain ownership of content you create. By using the Service, you grant us a license
              to store, process, and display your content as necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Privacy</h2>
            <p className="text-muted-foreground">
              Your use of the Service is also governed by our Privacy Policy, which is incorporated
              into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
              SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF
              THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold us harmless from any claims, damages, or expenses
              arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">12. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account at any time for violation of these Terms.
              Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will provide notice of
              significant changes. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">14. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by the laws of the jurisdiction in which we operate,
              without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">15. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: legal@lifeorganizer.app
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
