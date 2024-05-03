import { Button, Text, View } from 'react-native';
import moment from 'moment';

class Plugin {
	start() {
		alert('Started!');
	}

	stop() {
		alert('Stopped!');
	}

	getSettingsPanel() {
		const store = settings.useSettingsStore();
		const count = store.get('count', 0);

		return <View>
			<Text>
				Last Updated: {moment().toString()}
			</Text>
			<Button onPress={() => store.set('count', 0)} title='Clicks' />
			<Text>
				{count}
			</Text>
		</View>;
	}
}

export default Plugin;
