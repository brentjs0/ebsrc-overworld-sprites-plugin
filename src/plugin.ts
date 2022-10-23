export const yamlHeader = '## File Format: ebsrc-sprite-groups-plugin v1.0.0' as const;

export const spriteGroupPalettesYmlFileComment =
`${yamlHeader}

# Sprite group palettes should be edited in sprite_group_palettes.png when
# using ebsrc-sprite-groups-plugin. This file exists to provide the above file
# format header comment so that the plugin knows where to find sprite group
# palette data when applying modifications to the project.`;

export const filePaths =
{
    spriteGroupingPointersAsm: 'src/data/sprite_grouping_pointers.asm',
    spriteGroupingDataAsm: 'src/data/sprite_grouping_data.asm',
    bank11Asm: 'src/bankconfig/US/bank11.asm',
    bank12Asm: 'src/bankconfig/US/bank12.asm',
    bank13Asm: 'src/bankconfig/US/bank13.asm',
    bank14Asm: 'src/bankconfig/US/bank14.asm',
    bank15Asm: 'src/bankconfig/US/bank15.asm',
    bank03Asm: 'src/bankconfig/US/bank03.asm',
    spriteGroupsYml: 'sprite_groups.yml',
    spriteGroupPalettesYml: 'sprite_group_palettes.yml',
    spriteGroupPalettesPng: 'sprite_group_palettes.png',
    spriteGroupsDirectory: 'SpriteGroups/'
} as const;