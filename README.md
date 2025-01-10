# Strapi plugin strapi-plugin-components-usage-info

A Strapi plugin to find out the collections where a selected component is populated with data.

## What problem does this plugin solve?

When trying to identify if a certain component is populated with any data anywhere within that setup, this plugin can be used to quickly find this information. This can be useful for analysis before:

- Modifying the fields of an existing component.
- Deleting a component from the setup.

## How does it work?

Once installed and enabled, the plugin displays a list of all the components in the setup. On selecting a certain component, it lists the collections and records that contain data for the selected component.

![image](https://github.com/geeky-biz/strapi-plugin-components-usage-info/blob/main/images/strapi-plugin-components-usage-info-screenshot.png)

## FAQ

When identifying if a component is populated within a certain record:
- If the selected component is directly not part of a collection, but instead part of another component that belongs to the collection, such relationships (upto any depth level) are taken into consideration.
- Locales are also taken into consideration and displayed.
- Only published records are considered. Draft versions or older versions of the records are not considered.
- This plugin works with Strapi v5.0.0 onwards. It does not support earlier Strapi versions.

## Bugs
For any bugs, please create an issue [here](https://github.com/geeky-biz/strapi-plugin-components-usage-info/issues).

## About
- This plugin is created by [Punit Sethi](https://punits.dev).
- I'm an independent developer working on Strapi migrations, customizations, configuration projects (see [here](https://punits.dev/strapi-customizations/)).
- For any Strapi implementation requirement, please write to me at `punit@tezify.com`.
