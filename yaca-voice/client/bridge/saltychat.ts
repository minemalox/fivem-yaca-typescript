import type { YaCAClientModule } from "../yaca";
import { YacaResponseCode } from "types";
import { cache } from "../utils";
import { sleep } from "common/index";
import { locale } from "common/locale";
import { saltyChatExport } from "common/bridge";

/**
 * The SaltyChat bridge for the client.
 */
export class YaCAClientSaltyChatBridge {
  private clientModule: YaCAClientModule;

  private prevPluginState: YacaResponseCode | null = null;

  /**
   * Creates an instance of the SaltyChat bridge.
   *
   * @param {YaCAClientModule} clientModule - The client module.
   */
  constructor(clientModule: YaCAClientModule) {
    this.clientModule = clientModule;

    this.registerSaltyChatKeyBinds();
    this.registerSaltyChatExports();
    this.enableRadio();

    console.log("[YaCA] SaltyChat bridge loaded");

    on("onResourceStop", (resourceName: string) => {
      if (cache.resource !== resourceName) {
        return;
      }

      emit("onClientResourceStop", "saltychat");
    });
  }

  /**
   * Enables the radio on bridge load.
   */
  async enableRadio() {
    while (!this.clientModule.isPluginInitialized(true)) {
      await sleep(1000);
    }

    this.clientModule.radioModule.enableRadio(true);
  }

  /**
   * Register SaltyChat key binds.
   */
  registerSaltyChatKeyBinds() {
    RegisterCommand(
      "+primaryRadio",
      () => {
        this.clientModule.radioModule.changeActiveRadioChannel(1);
        this.clientModule.radioModule.radioTalkingStart(true);
      },
      false,
    );
    RegisterCommand(
      "-primaryRadio",
      () => {
        this.clientModule.radioModule.radioTalkingStart(false);
      },
      false,
    );
    RegisterKeyMapping(
      "+primaryRadio",
      locale("use_salty_primary_radio"),
      "keyboard",
      this.clientModule.sharedConfig.saltyChatBridge.keyBinds.primaryRadio,
    );

    RegisterCommand(
      "+secondaryRadio",
      () => {
        this.clientModule.radioModule.changeActiveRadioChannel(2);
        this.clientModule.radioModule.radioTalkingStart(true);
      },
      false,
    );
    RegisterCommand(
      "-secondaryRadio",
      () => {
        this.clientModule.radioModule.radioTalkingStart(false);
      },
      false,
    );
    RegisterKeyMapping(
      "+secondaryRadio",
      locale("use_salty_secondary_radio"),
      "keyboard",
      this.clientModule.sharedConfig.saltyChatBridge.keyBinds.secondaryRadio,
    );
  }

  /**
   * Register SaltyChat exports.
   */
  registerSaltyChatExports() {
    saltyChatExport("y", () => this.clientModule.getVoiceRange());

    saltyChatExport("GetRadioChannel", (primary: boolean) => {
      const channel = primary ? 1 : 2;
      return this.clientModule.radioModule.radioChannelSettings[channel]
        .frequency;
    });

    saltyChatExport(
      "GetRadioVolume",
      () => this.clientModule.radioModule.radioChannelSettings[1].volume,
    );

    saltyChatExport("GetRadioSpeaker", () => {
      console.warn("GetRadioSpeaker is not implemented in YaCA");
      return false;
    });

    saltyChatExport("GetMicClick", () => {
      console.warn("GetMicClick is not implemented in YaCA");
      return false;
    });

    saltyChatExport(
      "SetRadioChannel",
      (radioChannelName: string, primary: boolean) => {
        const channel = primary ? 1 : 2;
        this.clientModule.radioModule.changeRadioFrequencyRaw(
          channel,
          radioChannelName,
        );
      },
    );

    saltyChatExport("SetRadioVolume", (volume: number) => {
      this.clientModule.radioModule.changeRadioChannelVolumeRaw(1, volume);
      this.clientModule.radioModule.changeRadioChannelVolumeRaw(2, volume);
    });

    saltyChatExport("SetRadioSpeaker", () => {
      console.warn("SetRadioSpeaker is not implemented in YaCA");
    });

    saltyChatExport("SetMicClick", () => {
      console.warn("SetMicClick is not implemented in YaCA");
    });
  }

  /**
   * Handles the plugin state change.
   *
   * @param response - The last response code.
   */
  handleChangePluginState(response: YacaResponseCode) {
    if (this.prevPluginState === response) {
      return;
    }
    let state = 0;

    switch (response) {
      case "OK":
        state = 2;
        break;
      case "MOVE_ERROR":
      case "OUTDATED_VERSION":
      case "WAIT_GAME_INIT":
        state = 1;
        break;
      case "WRONG_TS_SERVER":
      case "NOT_CONNECTED":
        state = 0;
        break;
      default:
        return;
    }

    this.prevPluginState = response;
    emit("SaltyChat_PluginStateChanged", state);
  }

  /**
   * Handles the websocket disconnect.
   */
  handleDisconnectState() {
    this.prevPluginState = null;
    emit("SaltyChat_PluginStateChanged", -1);
  }
}
