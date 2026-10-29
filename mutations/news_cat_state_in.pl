s/AND \{\$state\['column'\]\} IN \(:stdefault, :stpublic\)/AND ({\$state['column']} IN (:stdefault, :stpublic) OR 1 = 1)/;
