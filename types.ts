
export type VoiceOption = {
  name: string;
  value: string;
};

export const VOICES: VoiceOption[] = [
  { name: 'Kore (Female)', value: 'Kore' },
  { name: 'Puck (Male)', value: 'Puck' },
  { name: 'Charon (Male)', value: 'Charon' },
  { name: 'Fenrir (Male)', value: 'Fenrir' },
  { name: 'Zephyr (Female)', value: 'Zephyr' },
];

export type AudioData = {
  buffer: AudioBuffer;
  blob: Blob;
};
