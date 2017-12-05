## Appium API Documentation

<div class="api-index">
{{#*inline "commands"}}
  {{#each commands}}
    <li>
      {{#if path}}<a href='{{path}}'>{{name}}</a>{{else}}{{name}}<ul>{{>commands}}</ul>{{/if}}
    </li>
  {{/each}}
{{/inline}}

<ul>
{{>commands}}
</ul>
</div>
