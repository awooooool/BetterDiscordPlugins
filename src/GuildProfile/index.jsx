/* @license
 * Copyright (c) 2021 jaimeadf (Jaime Filho)
 * Licensed under the Open Software License version 3.0
 */

import React from 'react';

import { DiscordModules, WebpackModules, PluginUtilities, Patcher, Utilities, Settings, DCM } from '@zlibrary/api';
import Plugin from '@zlibrary/plugin';

import i18n from '@discord/i18n';
import { ModalRoot } from '@discord/components/Modal';

import GuildProfileModal from './components/GuildProfileModal';
import GuildProfileIcon from './assets/guild-profile.svg';

import MemberCountsStore from './stores/MemberCountsStore';

import style from './style.scss';
import locales from './locales';

const { ModalActions, UserSettingsStore, SelectedGuildStore, GuildStore } = DiscordModules;

const Menu = WebpackModules.getByProps('MenuItem');

export default class GuildProfile extends Plugin {
    constructor() {
        super();

        this.defaultSettings = {
            position: 'top'
        };

        this.handleUserSettingsChange = this.handleUserSettingsChange.bind(this);
    }

    onStart() {
        PluginUtilities.addStyle(this.getName(), style);
        UserSettingsStore.addChangeListener(this.handleUserSettingsChange);

        MemberCountsStore.initializeIfNeeded();

        this.loadLocale();
        this.patchMenu();
        this.patchGuildContextMenu();
    }

    onStop() {
        PluginUtilities.removeStyle(this.getName());
        UserSettingsStore.removeChangeListener(this.handleUserSettingsChange);

        Patcher.unpatchAll();
    }

    buildSettingsPanel() {
        return new Settings.SettingPanel(
            this.saveSettings.bind(this),
            new Settings.Dropdown(
                'Context menu position',
                'The position of the guild profile item on the context menu, the one opened when you right-click a guild.',
                this.settings.position,
                [
                    { label: 'Top', value: 'top' },
                    { label: 'Bottom', value: 'bottom' }
                ],
                value => (this.settings.position = value)
            )
        );
    }

    getSettingsPanel() {
        return this.buildSettingsPanel().getElement();
    }

    patchMenu() {
        Patcher.before(Menu, 'default', (thisObject, [props]) => {
            if (!props) {
                return;
            }

            const { navId, children } = props;

            if (
                navId !== 'guild-header-popout' ||
                Utilities.findInReactTree(children, c => c?.id === 'guild-profile')
            ) {
                return;
            }

            children.unshift(
                <Menu.MenuGroup>
                    <Menu.MenuItem
                        id="guild-profile"
                        label={i18n.Messages.GUILD_PROFILE}
                        icon={GuildProfileIcon}
                        action={() => this.openGuildProfileModal(GuildStore.getGuild(SelectedGuildStore.getGuildId()))}
                    />
                </Menu.MenuGroup>
            );
        });
    }

    async patchGuildContextMenu() {
        const GuildContextMenu = await DCM.getDiscordMenu('GuildContextMenu');

        Patcher.after(GuildContextMenu, 'default', (thisObject, [{ guild }], returnValue) => {
            returnValue.props.children.splice(
                this.settings.position === 'top' ? 1 : 5,
                0,
                <Menu.MenuGroup>
                    <Menu.MenuItem
                        id="guild-profile"
                        key="guild-profile"
                        label={i18n.Messages.GUILD_PROFILE}
                        action={() => this.openGuildProfileModal(guild)}
                    />
                </Menu.MenuGroup>
            );
        });
    }

    async handleUserSettingsChange() {
        await i18n.loadPromise;
        this.loadLocale();
    }

    loadLocale() {
        Object.assign(i18n._provider._context.messages, locales[UserSettingsStore.locale]);
        Object.assign(i18n._provider._context.defaultMessages, locales['en-US']);
    }

    openGuildProfileModal(guild) {
        ModalActions.openModal(props => (
            <ModalRoot className="root-8LYsGj guild-profile" {...props}>
                <GuildProfileModal guild={guild} />
            </ModalRoot>
        ));
    }
}
