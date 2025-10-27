type SVGComponent = React.FunctionComponent<
	React.ComponentProps<"svg"> & {
		title?: string;
		titleId?: string;
		desc?: string;
		descId?: string;
	}
>;
