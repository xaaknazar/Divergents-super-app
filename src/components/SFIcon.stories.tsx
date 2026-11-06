import type { Meta, StoryObj } from '@storybook/react-native';
import { SF } from './SFIcon';
const meta = { title: 'Atoms/SFIcon', component: SF, args: {name:'bell.fill',size:24,color:'#234088'} } satisfies Meta<typeof SF>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default:Story={};
export const OnGlass:Story={args:{color:'#FFFFFF',contrast:'onGlass'}};
export const OnGlassDark:Story={...OnGlass,parameters:{scheme:'dark'}};
export const MutedOnGlass:Story={args:{color:'rgba(255,255,255,0.45)',contrast:'onGlassMuted'}};
