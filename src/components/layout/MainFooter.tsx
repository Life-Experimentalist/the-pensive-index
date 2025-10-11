/**
 * Main Footer Component
 *
 * Standardized footer for all public pages (non-admin)
 * Provides links, copyright, and social information
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import Link from 'next/link';
import { Github, Twitter, Mail } from 'lucide-react';

const footerLinks = {
  product: [
    { name: 'Fandoms', href: '/fandom' },
    { name: 'Pathway Builder', href: '/pathway' },
    { name: 'Submit Story', href: '/submit' },
  ],
  resources: [
    { name: 'Documentation', href: '/docs' },
    { name: 'API', href: '/api' },
    { name: 'GitHub', href: 'https://github.com/Life-Experimentalists/the-pensive-index' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Contributing', href: '/contributing' },
  ],
};

const socialLinks = [
  {
    name: 'GitHub',
    href: 'https://github.com/Life-Experimentalists/the-pensive-index',
    icon: Github,
  },
  { name: 'Twitter', href: '#', icon: Twitter },
  { name: 'Email', href: 'mailto:pensive@vkrishna04.me', icon: Mail },
];

export default function MainFooter() {
  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-lg font-bold text-foreground mb-4">
              The Pensieve Index
            </h3>
            <p className="text-sm text-foreground/60 mb-4">
              Your library-first fanfiction discovery platform
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-foreground/60 hover:text-foreground transition-colors"
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-foreground/60 text-center">
            &copy; {new Date().getFullYear()} The Pensieve Index. All rights reserved.
            Built with ❤️ for the fanfiction community.
          </p>
        </div>
      </div>
    </footer>
  );
}
