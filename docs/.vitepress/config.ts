export default {
  title: 'Dusk',
  description: 'The calm work environment for AI',
  lang: 'en-US',
  cleanUrls: true,
  appearance: 'dark',
  lastUpdated: true,
  socialLinks: [
    { icon: 'github', link: 'https://github.com/fugoku/dusk' },
    { icon: 'twitter', link: 'https://twitter.com/fugoku' }
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Developer', link: '/developer/architecture' },
      { text: 'Legal', link: '/legal/privacy' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Workspaces', link: '/guide/workspaces' },
            { text: 'Providers', link: '/guide/providers' },
            { text: 'Agents', link: '/guide/agents' },
            { text: 'Files', link: '/guide/files' },
            { text: 'Themes', link: '/guide/themes' },
            { text: 'Shortcuts', link: '/guide/shortcuts' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' }
          ]
        }
      ],
      '/developer/': [
        {
          text: 'Developer',
          items: [
            { text: 'Architecture', link: '/developer/architecture' },
            { text: 'Contributing', link: '/developer/contributing' },
            { text: 'API Reference', link: '/developer/api' }
          ]
        }
      ],
      '/legal/': [
        {
          text: 'Legal',
          items: [
            { text: 'Privacy Policy', link: '/legal/privacy' },
            { text: 'Terms of Service', link: '/legal/terms' },
            { text: 'License', link: '/legal/license' }
          ]
        }
      ]
    },
    search: {
      provider: 'local'
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present Dusk Contributors'
    },
    editLink: {
      pattern: 'https://github.com/fugoku/dusk/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
}
